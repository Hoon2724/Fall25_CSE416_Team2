import { supabase } from '../supabaseClient';

// 1. 채팅방 목록 조회
export const getChatRooms = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { data: chatRooms, error: chatRoomsError } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        item_id,
        last_message,
        last_message_at,
        unread_by_buyer,
        unread_by_seller,
        created_at,
        items (
          id,
          title,
          price
        ),
        users!chat_rooms_buyer_id_fkey (
          id,
          display_name
        ),
        users!chat_rooms_seller_id_fkey (
          id,
          display_name
        )
      `)
      .or(`buyer_id.eq.${user.id}, seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (chatRoomsError) throw chatRoomsError;

    const transformedChatRooms = chatRooms.map(room => {
      // 현재 사용자가 buyer인지 seller인지 확인
      const isBuyer = room.users_buyer_id_fkey.id === user.id;
      const otherUser = isBuyer ? room.users_seller_id_fkey : room.users_buyer_id_fkey;
      const unreadCount = isBuyer ? room.unread_by_buyer : room.unread_by_seller;

      return {
        id: room.id,
        item: room.items ? {
          id: room.items.id,
          title: room.items.title,
          price: room.items.price
        } : null,
        buyer: {
          id: room.users_buyer_id_fkey.id,
          display_name: room.users_buyer_id_fkey.display_name
        },
        seller: {
          id: room.users_seller_id_fkey.id,
          display_name: room.users_seller_id_fkey.display_name
        },
        last_message: room.last_message,
        last_message_at: room.last_message_at,
        unread_count: unreadCount,
        created_at: room.created_at
      };
    });

    return {
      res_code: 200,
      res_msg: '채팅방 목록 조회 성공',
      chat_rooms: transformedChatRooms
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 2. 채팅방 생성
export const createChatRoom = async (itemId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 아이템 정보 조회하여 seller_id 확인
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id')
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;

    // 현재 스키마에는 seller_id가 없으므로 임시로 처리
    // 실제로는 items 테이블에 seller_id 컬럼이 필요
    const sellerId = 'temp-seller-id'; // 임시값

    // 중복 채팅방 확인
    const { data: existingRoom, error: checkError } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('item_id', itemId)
      .eq('buyer_id', user.id)
      .eq('seller_id', sellerId)
      .single();

    if (existingRoom) {
      return {
        res_code: 409,
        res_msg: '이미 존재하는 채팅방입니다',
        chat_room: existingRoom
      };
    }

    // 채팅방 생성
    const { data: newChatRoom, error: createError } = await supabase
      .from('chat_rooms')
      .insert([
        {
          item_id: itemId,
          buyer_id: user.id,
          seller_id: sellerId,
          unread_by_buyer: 0,
          unread_by_seller: 0
        }
      ])
      .select()
      .single();

    if (createError) throw createError;

    return {
      res_code: 201,
      res_msg: '채팅방이 성공적으로 생성되었습니다',
      chat_room: newChatRoom
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 3. 아이템에서 직접 채팅방 생성
export const createChatRoomFromItem = async (itemId) => {
  // createChatRoom과 동일한 로직 사용
  return await createChatRoom(itemId);
};

// 4. 게시글 작성자와 채팅 시작
export const createChatFromPostAuthor = async (postId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 게시글 작성자 정보 조회
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    // 채팅방 생성 (item_id는 null로 설정)
    const { data: newChatRoom, error: createError } = await supabase
      .from('chat_rooms')
      .insert([
        {
          item_id: null,
          buyer_id: user.id,
          seller_id: post.author_id,
          unread_by_buyer: 0,
          unread_by_seller: 0
        }
      ])
      .select()
      .single();

    if (createError) throw createError;

    return {
      res_code: 201,
      res_msg: '채팅방이 성공적으로 생성되었습니다',
      chat_room: {
        id: newChatRoom.id,
        post_author_id: post.author_id,
        current_user_id: user.id
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

// 5. 채팅방 접근 권한 확인
export const checkChatRoomAccess = async (chatRoomId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { data: chatRoom, error: chatRoomError } = await supabase
      .from('chat_rooms')
      .select('buyer_id, seller_id, item_id')
      .eq('id', chatRoomId)
      .single();

    if (chatRoomError) throw chatRoomError;

    const hasAccess = chatRoom.buyer_id === user.id || chatRoom.seller_id === user.id;
    const userRole = chatRoom.buyer_id === user.id ? 'buyer' : 'seller';

    return {
      res_code: 200,
      res_msg: '채팅방 접근 권한 확인 완료',
      has_access: hasAccess,
      user_role: hasAccess ? userRole : null,
      item_id: chatRoom.item_id
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};
