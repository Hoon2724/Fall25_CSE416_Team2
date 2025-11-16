import { supabase } from '../supabaseClient';


export const getChatRooms = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { data: chatRooms, error: chatRoomsError } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        item_id,
        buyer_id,
        seller_id,
        last_message,
        last_message_at,
        unread_by_buyer,
        unread_by_seller,
        created_at
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (chatRoomsError) throw chatRoomsError;

    const buyerIds = chatRooms.map(room => room.buyer_id).filter(Boolean);
    const sellerIds = chatRooms.map(room => room.seller_id).filter(Boolean);
    const userIds = Array.from(new Set([...buyerIds, ...sellerIds]));

    let usersMap = new Map();
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, trust_score')
        .in('id', userIds);
      if (usersError) throw usersError;
      usersMap = new Map(usersData.map(userRow => [userRow.id, userRow]));
    }

    const itemIds = chatRooms
      .map(room => room.item_id)
      .filter(idVal => idVal !== null && idVal !== undefined);

    let itemsMap = new Map();
    if (itemIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('id, title, price')
        .in('id', itemIds);
      if (itemsError) throw itemsError;
      itemsMap = new Map(itemsData.map(itemRow => [itemRow.id, itemRow]));
    }

    const transformedChatRooms = chatRooms.map(room => {
      const buyerProfile = usersMap.get(room.buyer_id) || null;
      const sellerProfile = usersMap.get(room.seller_id) || null;
      const itemProfile = room.item_id ? itemsMap.get(room.item_id) || null : null;
      const isBuyer = room.buyer_id === user.id;
      const unreadCount = isBuyer ? room.unread_by_buyer : room.unread_by_seller;

      return {
        id: room.id,
        item: itemProfile
          ? {
              id: itemProfile.id,
              title: itemProfile.title,
              price: itemProfile.price,
            }
          : null,
        buyer: buyerProfile
          ? {
              id: buyerProfile.id,
              display_name: buyerProfile.display_name,
              trust_score: buyerProfile.trust_score,
            }
          : { id: room.buyer_id, display_name: null },
        seller: sellerProfile
          ? {
              id: sellerProfile.id,
              display_name: sellerProfile.display_name,
              trust_score: sellerProfile.trust_score,
            }
          : { id: room.seller_id, display_name: null },
        last_message: room.last_message,
        last_message_at: room.last_message_at,
        unread_count: unreadCount,
        created_at: room.created_at,
      };
    });

    return {
      res_code: 200,
      res_msg: 'Chat rooms list retrieved successfully',
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


export const createChatRoom = async (itemId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;

    const sellerId = item.seller_id;

    if (!sellerId) {
      return {
        res_code: 400,
        res_msg: 'Seller information is missing for this item.'
      };
    }

    if (sellerId === user.id) {
      return {
        res_code: 400,
        res_msg: 'You cannot start a chat with yourself.'
      };
    }

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
        res_msg: 'Chat room already exists',
        chat_room: existingRoom
      };
    }

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
      res_msg: 'Chat room created successfully',
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

export const createChatRoomFromItem = async (itemId) => {
  return await createChatRoom(itemId);
};

export const createChatFromPostAuthor = async (postId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    if (!post?.author_id) {
      return {
        res_code: 400,
        res_msg: 'Author information is missing for this post.'
      };
    }

    if (post.author_id === user.id) {
      return {
        res_code: 400,
        res_msg: 'You cannot start a chat with yourself.'
      };
    }

    const { data: existingRoom, error: existingError } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('seller_id', post.author_id)
      .is('item_id', null)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingRoom) {
      return {
        res_code: 409,
        res_msg: 'Chat room already exists',
        chat_room: existingRoom
      };
    }

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
      res_msg: 'Chat room created successfully',
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

export const checkChatRoomAccess = async (chatRoomId) => {
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
      .select('buyer_id, seller_id, item_id')
      .eq('id', chatRoomId)
      .single();

    if (chatRoomError) throw chatRoomError;

    const hasAccess = chatRoom.buyer_id === user.id || chatRoom.seller_id === user.id;
    const userRole = chatRoom.buyer_id === user.id ? 'buyer' : 'seller';

    return {
      res_code: 200,
      res_msg: 'Chat room access permission verified',
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
