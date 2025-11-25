import { supabase } from '../supabaseClient';

const toPublicImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  try {
    const { data } = supabase.storage.from('items').getPublicUrl(url);
    return data?.publicUrl || url;
  } catch {
    return url;
  }
};


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
      .order('created_at', { ascending: true }); // Sort by creation time, oldest first

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
        .select(`
          id, 
          title, 
          price,
          item_images (
            id,
            url,
            sort_order
          )
        `)
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
        item_id: room.item_id,
        item: itemProfile
          ? {
              id: itemProfile.id,
              title: itemProfile.title,
              price: itemProfile.price,
              images: (itemProfile.item_images || []).map(img => ({
                id: img.id,
                url: toPublicImageUrl(img.url),
                sort_order: img.sort_order || 0
              }))
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
      .select('seller_id, status')
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
      .maybeSingle();

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

    // Update item status to 'in_transaction' if it's currently 'selling'
    if (item.status === 'selling') {
      await supabase
        .from('items')
        .update({ status: 'in_transaction' })
        .eq('id', itemId);
    }

    // Broadcast to seller about new chat
    try {
      const channel = supabase.channel(`notify:${sellerId}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'notify',
        payload: {
          type: 'item_chat',
          chat_room_id: newChatRoom.id,
          item_id: itemId,
          title: 'New chat on your item',
          content: ''
        }
      });
      supabase.removeChannel(channel);
    } catch (_) {}

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

export const completeTransaction = async (chatRoomId, rating, comment = '') => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    // Get chat room info
    const { data: chatRoom, error: chatRoomError } = await supabase
      .from('chat_rooms')
      .select('item_id, buyer_id, seller_id')
      .eq('id', chatRoomId)
      .single();

    if (chatRoomError) throw chatRoomError;

    if (!chatRoom.item_id) {
      return {
        res_code: 400,
        res_msg: 'This chat room is not associated with an item'
      };
    }

    // Determine who is the other party (the one being rated)
    const isBuyer = chatRoom.buyer_id === user.id;
    const isSeller = chatRoom.seller_id === user.id;

    if (!isBuyer && !isSeller) {
      return {
        res_code: 403,
        res_msg: 'You are not a participant in this chat room'
      };
    }

    // Always rate the seller (the person who posted the item)
    const revieweeId = chatRoom.seller_id;

    // Validate rating: 1-5 range, 0.5 increments
    if (rating < 1 || rating > 5) {
      return {
        res_code: 400,
        res_msg: 'Rating must be between 1 and 5'
      };
    }
    
    const ratingRounded = Math.round(rating * 2) / 2;
    if (Math.abs(rating - ratingRounded) > 0.01) {
      return {
        res_code: 400,
        res_msg: 'Rating must be in 0.5 increments (e.g., 1.0, 1.5, 2.0, etc.)'
      };
    }

    // Check if review already exists
    const { data: existingReview, error: checkError } = await supabase
      .from('reviews')
      .select('id')
      .eq('reviewer_id', user.id)
      .eq('reviewee_id', revieweeId)
      .eq('item_id', chatRoom.item_id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingReview) {
      return {
        res_code: 409,
        res_msg: 'You have already reviewed this transaction'
      };
    }

    // Create review
    const { data: newReview, error: reviewError } = await supabase
      .from('reviews')
      .insert([
        {
          reviewer_id: user.id,
          reviewee_id: revieweeId,
          item_id: chatRoom.item_id,
          rating: ratingRounded,
          comment: comment || null
        }
      ])
      .select()
      .single();

    if (reviewError) throw reviewError;

    // Update total_reviews count
    const { data: currentUser, error: userFetchError } = await supabase
      .from('users')
      .select('total_reviews')
      .eq('id', revieweeId)
      .single();

    if (!userFetchError && currentUser) {
      const nextCount = (currentUser.total_reviews ?? 0) + 1;
      await supabase
        .from('users')
        .update({ total_reviews: nextCount })
        .eq('id', revieweeId);
    }

    // Recalculate trust_score
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', revieweeId);

    if (!reviewsError && reviews.length > 0) {
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      
      await supabase
        .from('users')
        .update({
          trust_score: Math.round(averageRating * 10) / 10
        })
        .eq('id', revieweeId);
    }

    // Update item status to 'sold'
    await supabase
      .from('items')
      .update({ status: 'sold' })
      .eq('id', chatRoom.item_id);

    return {
      res_code: 200,
      res_msg: 'Transaction completed and review submitted successfully',
      review: newReview
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
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

    // Broadcast to post author
    try {
      const channel = supabase.channel(`notify:${post.author_id}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'notify',
        payload: {
          type: 'post_chat',
          chat_room_id: newChatRoom.id,
          title: 'New chat on your post',
          content: ''
        }
      });
      supabase.removeChannel(channel);
    } catch (_) {}

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
