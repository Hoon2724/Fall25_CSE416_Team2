import { supabase } from '../supabaseClient';

export const getMessages = async (chatRoomId, filters = {}) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const {
      page = 1,
      limit = 50
    } = filters;

    const { data: chatRoom, error: chatRoomError } = await supabase
      .from('chat_rooms')
      .select('buyer_id, seller_id, unread_by_buyer, unread_by_seller')
      .eq('id', chatRoomId)
      .single();

    if (chatRoomError) throw chatRoomError;

    if (chatRoom.buyer_id !== user.id && chatRoom.seller_id !== user.id) {
      return {
        res_code: 403,
        res_msg: 'You do not have access to this chat room'
      };
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: messages, error: messagesError, count } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        is_read,
        created_at,
        users!messages_sender_id_fkey (
          id,
          display_name
        )
      `)
      .eq('chat_room_id', chatRoomId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (messagesError) throw messagesError;

    const transformedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      sender: {
        id: message.users.id,
        display_name: message.users.display_name
      },
      is_read: message.is_read,
      created_at: message.created_at
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      res_code: 200,
      res_msg: 'Messages retrieved successfully',
      messages: transformedMessages,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: count,
        has_next: page < totalPages
      }
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const sendMessage = async (messageData) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { chat_room_id, content } = messageData;

    const { data: chatRoom, error: chatRoomError } = await supabase
      .from('chat_rooms')
      .select('buyer_id, seller_id, unread_by_buyer, unread_by_seller')
      .eq('id', chat_room_id)
      .single();

    if (chatRoomError) throw chatRoomError;

    if (chatRoom.buyer_id !== user.id && chatRoom.seller_id !== user.id) {
      return {
        res_code: 403,
        res_msg: 'You do not have access to this chat room'
      };
    }

    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert([
        {
          chat_room_id,
          content,
          sender_id: user.id,
          is_read: false
        }
      ])
      .select()
      .single();

    if (messageError) throw messageError;

    const isBuyer = chatRoom.buyer_id === user.id;
    const unreadByBuyer = chatRoom.unread_by_buyer ?? 0;
    const unreadBySeller = chatRoom.unread_by_seller ?? 0;

    const unreadUpdate =
      isBuyer
        ? { unread_by_seller: unreadBySeller + 1, unread_by_buyer: unreadByBuyer }
        : { unread_by_buyer: unreadByBuyer + 1, unread_by_seller: unreadBySeller };

    await supabase
      .from('chat_rooms')
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        ...unreadUpdate
      })
      .eq('id', chat_room_id);

    return {
      res_code: 201,
      res_msg: 'Message sent successfully',
      message: {
        id: newMessage.id,
        content: newMessage.content,
        sender_id: newMessage.sender_id,
        chat_room_id: newMessage.chat_room_id,
        created_at: newMessage.created_at
      }
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const markMessagesAsRead = async (chatRoomId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { data: chatRoom, error: chatRoomError } = await supabase
      .from('chat_rooms')
      .select('buyer_id, seller_id')
      .eq('id', chatRoomId)
      .single();

    if (chatRoomError) throw chatRoomError;

    if (chatRoom.buyer_id !== user.id && chatRoom.seller_id !== user.id) {
      return {
        res_code: 403,
        res_msg: 'You do not have access to this chat room'
      };
    }

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_room_id', chatRoomId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

            
    const isBuyer = chatRoom.buyer_id === user.id;
    const updateField = isBuyer ? 'unread_by_buyer' : 'unread_by_seller';

    await supabase
      .from('chat_rooms')
      .update({
        [updateField]: 0
      })
      .eq('id', chatRoomId);

    return {
      res_code: 200,
      res_msg: 'Messages marked as read'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};
