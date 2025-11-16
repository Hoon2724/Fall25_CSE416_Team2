import { supabase } from '../supabaseClient';
import { sendMessage as sendMessageApi } from './messages';

// Channel name helpers
const messageChannelName = (chatRoomId) => `room-${chatRoomId}`;
const chatRoomsChannelName = () => 'realtime-chat-rooms';

// Subscribe to chat rooms (for creation/update) using postgres_changes
export function subscribeChatRooms(onAnyChange) {
	// Single shared channel for chat_rooms table
	const channel = supabase
		.channel(chatRoomsChannelName())
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'chat_rooms' },
			(payload) => {
				onAnyChange?.(payload);
			}
		)
		.subscribe();

	return () => {
		supabase.removeChannel(channel);
	};
}

// Create a message channel (broadcast + postgres backup) for a specific chat room
export function createMessageChannel(chatRoomId, currentUserId, onBroadcastMessage, onBackupInsert) {
	let broadcastChannel = null;
	let backupChannel = null;

	// Broadcast channel for immediate UI updates
	broadcastChannel = supabase
		.channel(messageChannelName(chatRoomId))
		.on('broadcast', { event: 'message' }, (payload) => {
			const msg = payload?.payload;
			if (!msg) return;
			onBroadcastMessage?.(msg, currentUserId);
		})
		.subscribe();

	// Postgres changes as backup to reconcile if any broadcast missed
	backupChannel = supabase
		.channel(`realtime-messages-${chatRoomId}`)
		.on(
			'postgres_changes',
			{ event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_room_id=eq.${chatRoomId}` },
			(payload) => {
				onBackupInsert?.(payload);
			}
		)
		.subscribe();

	const cleanup = () => {
		if (broadcastChannel) supabase.removeChannel(broadcastChannel);
		if (backupChannel) supabase.removeChannel(backupChannel);
	};

	// For convenience, expose a sender that uses the same broadcast channel
	const sendBroadcast = async (payload) => {
		// If the broadcast channel is gone, recreate a temporary one just to send
		const channel = broadcastChannel ?? supabase.channel(messageChannelName(chatRoomId));
		try {
			await channel.send({ type: 'broadcast', event: 'message', payload });
			// If we created a temp channel, remove it immediately
			if (broadcastChannel == null) supabase.removeChannel(channel);
		} catch (e) {
			// ignore; UI will still update from DB + backup subscription
			// eslint-disable-next-line no-console
			console.warn('[chatRealtime] broadcast send failed', e);
		}
	};

	return { cleanup, sendBroadcast };
}

// Hybrid send: persist to DB, optimistically update UI via callback, then broadcast
export async function sendMessageHybrid({ chatRoomId, content, currentUser }, { onOptimistic, onAfterPersist }, broadcastSender) {
	if (!chatRoomId || !content?.trim() || !currentUser?.id) return null;

	const trimmed = content.trim();

	// 1) Persist to DB
	const result = await sendMessageApi({
		chat_room_id: chatRoomId,
		content: trimmed
	});

	if (result?.res_code !== 201 || !result?.message) {
		return null;
	}

	// 2) Optimistic UI
	const msg = {
		id: result.message.id,
		content: result.message.content,
		senderId: currentUser.id,
		senderName: currentUser.display_name || 'Me',
		chat_room_id: chatRoomId,
		created_at: result.message.created_at
	};

	onOptimistic?.(msg);
	onAfterPersist?.(msg);

	// 3) Broadcast to peers
	if (broadcastSender) {
		await broadcastSender(msg);
	}

	return msg;
}

// Optional: broadcast new chat room creation (if you call from creation flow)
export async function broadcastChatRoomCreated(chatRoomId) {
	if (!chatRoomId) return;
	const channel = supabase.channel(chatRoomsChannelName());
	try {
		await channel.send({ type: 'broadcast', event: 'chat_room_created', payload: { id: chatRoomId } });
	} finally {
		supabase.removeChannel(channel);
	}
}


