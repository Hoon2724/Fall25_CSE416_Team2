import { supabase } from '../supabaseClient';

const toPublicImageUrl = (url) => {
  if (!url) return null;
  
  // If it's already a full URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  try {
    // Try to get public URL from storage
    const { data } = supabase.storage.from('items').getPublicUrl(url);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
    
    // Fallback: construct URL manually if needed
    const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(url);
    return publicUrl || url;
  } catch (error) {
    console.warn('Error getting public URL for:', url, error);
    return url;
  }
};

export const getItems = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      sort = 'newest',
      price_min,
      price_max
    } = filters;

    let query = supabase
      .from('items')
      .select(`
        id,
        title,
        description,
        price,
        category,
        category_id,
        seller_id,
        status,
        created_at,
        categories (
          id,
          name
        ),
        item_images (
          id,
          url
        ),
        users!items_seller_id_fkey (
          id,
          display_name,
          trust_score
        )
      `);

    if (category) {
      query = query.eq('category_id', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%`);
    }

    if (price_min) {
      query = query.gte('price', price_min);
    }
    if (price_max) {
      query = query.lte('price', price_max);
    }

    const sortField = sort === 'oldest' ? 'created_at' : 
                     sort === 'price_asc' ? 'price' : 
                     sort === 'price_desc' ? 'price' : 'created_at';
    const ascending = sort === 'oldest' || sort === 'price_asc';
    query = query.order(sortField, { ascending });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: items, error: itemsError, count } = await query;

    if (itemsError) throw itemsError;

    const transformedItems = items.map(item => {
      const images = item.item_images
        ? item.item_images.map(img => ({
            id: img.id,
            url: toPublicImageUrl(img.url)
          }))
        : [];

      const displayName = item.users?.display_name || null;
      const trustScore = item.users?.trust_score ?? null;

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        price: item.price,
        category: item.categories?.name || null,
        category_id: item.category_id,
        status: item.status || 'selling',
        image_url: images.length > 0 ? images[0].url : null,
        images,
        tags: [],
        seller_id: item.seller_id,
        seller_display_name: displayName,
        seller_trust_score: trustScore,
        seller: {
          id: item.seller_id,
          display_name: displayName,
          trust_score: trustScore
        },
        created_at: item.created_at
      };
    });

    const totalPages = Math.ceil(count / limit);

    return {
      res_code: 200,
      res_msg: 'Items retrieved successfully',
      items: transformedItems,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: count,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      meta: {
        sort: sort,
        filters: {
          category,
          search,
          price_min,
          price_max
        }
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

export const getLatestItems = async (limit = 10) => {
  try {
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        id,
        title,
        description,
        price,
        category,
        category_id,
        seller_id,
        status,
        created_at,
        item_images (
          url
        ),
        item_tags (
          tag
        ),
        users!items_seller_id_fkey (
          id,
          display_name,
          trust_score
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (itemsError) throw itemsError;

    const transformedItems = items.map(item => {
      const images = item.item_images
        ? item.item_images.map(img => ({
            url: toPublicImageUrl(img.url)
          }))
        : [];

      const displayName = item.users?.display_name || null;
      const trustScore = item.users?.trust_score ?? null;

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        price: item.price,
        category: item.category,
        category_id: item.category_id,
        status: item.status || 'selling',
        image_url: images.length > 0 ? images[0].url : null,
        images,
        tags: item.item_tags ? item.item_tags.map(tag => tag.tag) : [],
        seller_id: item.seller_id,
        seller_display_name: displayName,
        seller_trust_score: trustScore,
        seller: {
          id: item.seller_id,
          display_name: displayName,
          trust_score: trustScore
        },
        created_at: item.created_at
      };
    });

    return {
      res_code: 200,
      res_msg: 'Latest items retrieved successfully',
      items: transformedItems,
      meta: {
        sort: 'newest',
        filters: {}
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

export const getItemDetails = async (itemId) => {
  try {
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select(`
        id,
        title,
        description,
        price,
        seller_id,
        status,
        created_at,
        category_id,
        categories (
          id,
          name,
          description
        ),
        item_images (
          id,
          url
        ),
        users!items_seller_id_fkey (
          id,
          display_name,
          trust_score,
          total_reviews
        )
      `)
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;


    const transformedItem = {
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      category: item.categories?.name || null,
      category_id: item.category_id,
      status: item.status || 'selling',
      seller: {
        id: item.seller_id,
        display_name: item.users?.display_name || 'Seller',
        trust_score: item.users?.trust_score || 0.0,
        total_reviews: item.users?.total_reviews || 0
      },
      images: item.item_images ? item.item_images.map(img => ({
        id: img.id,
        url: toPublicImageUrl(img.url)
      })) : [],
      created_at: item.created_at
    };

    return {
      res_code: 200,
      res_msg: 'Item details retrieved successfully',
      item: transformedItem
    };
  } catch (error) {
    return {
      res_code: 404,
      res_msg: error.message,
      error: error
    };
  }
};

export const createItem = async (itemData) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { title, description, price, category_id, images } = itemData;

    const { data: newItem, error: itemError } = await supabase
      .from('items')
      .insert([
        {
          title,
          description,
          price,
          category_id,
          seller_id: user.id,
          status: 'selling'
        }
      ])
      .select()
      .single();

    if (itemError) throw itemError;

    if (images && images.length > 0) {
      const imageData = images.map((img, index) => ({
        item_id: newItem.id,
        url: img.image_url || img.url,
        sort_order: img.sort_order !== undefined ? img.sort_order : index
      }));

      const { error: imagesError } = await supabase
        .from('item_images')
        .insert(imageData);

      if (imagesError) {
        console.error('Error inserting item images:', imagesError);
        throw imagesError;
      }
    }

    return {
      res_code: 201,
      res_msg: 'Item created successfully',
      item: {
        id: newItem.id,
        title: newItem.title,
        description: newItem.description,
        price: newItem.price,
        status: newItem.status,
        seller_id: user.id, 
        created_at: newItem.created_at
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

export const updateItem = async (itemId, updates) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    // Check if user owns the item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', itemId)
      .single();

    if (itemError) {
      return {
        res_code: 404,
        res_msg: 'Item not found'
      };
    }

    if (item.seller_id !== user.id) {
      return {
        res_code: 403,
        res_msg: 'You can only update your own items'
      };
    }

    // Update item
    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: 'Item updated successfully',
      item: updatedItem
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const deleteItem = async (itemId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    // Check if user owns the item or is admin
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', itemId)
      .single();

    if (itemError) {
      return {
        res_code: 404,
        res_msg: 'Item not found'
      };
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.is_admin || false;

    if (item.seller_id !== user.id && !isAdmin) {
      return {
        res_code: 403,
        res_msg: 'You can only delete your own items'
      };
    }

    // First, update chat rooms to remove item reference, then delete messages and chat rooms
    const { data: chatRooms, error: chatRoomsError } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('item_id', itemId);

    if (!chatRoomsError && chatRooms && chatRooms.length > 0) {
      const chatRoomIds = chatRooms.map(room => room.id);
      
      // Delete messages in these chat rooms first
      const { error: messagesDeleteError } = await supabase
        .from('messages')
        .delete()
        .in('chat_room_id', chatRoomIds);

      if (messagesDeleteError) {
        console.warn('Error deleting messages:', messagesDeleteError);
      }

      // Set item_id to null in chat rooms first to avoid foreign key constraint
      const { error: updateError } = await supabase
        .from('chat_rooms')
        .update({ item_id: null })
        .eq('item_id', itemId);

      if (updateError) {
        console.warn('Error updating chat rooms:', updateError);
      }

      // Then delete chat rooms
      const { error: chatRoomsDeleteError } = await supabase
        .from('chat_rooms')
        .delete()
        .in('id', chatRoomIds);

      if (chatRoomsDeleteError) {
        console.warn('Error deleting chat rooms:', chatRoomsDeleteError);
      }
    }

    // Delete related reviews with error handling
    const { error: reviewsDeleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('item_id', itemId);

    if (reviewsDeleteError) {
      console.warn('Error deleting reviews:', reviewsDeleteError);
    }

    // Delete related wishlists with error handling
    const { error: wishlistsDeleteError } = await supabase
      .from('wishlists')
      .delete()
      .eq('item_id', itemId);

    if (wishlistsDeleteError) {
      console.warn('Error deleting wishlists:', wishlistsDeleteError);
    }

    // Delete item images from storage and database
    const { data: images } = await supabase
      .from('item_images')
      .select('url')
      .eq('item_id', itemId);

    if (images && images.length > 0) {
      // Delete from storage
      const imagePaths = images.map(img => img.url);
      try {
        await supabase.storage
          .from('items')
          .remove(imagePaths);
      } catch (storageError) {
        console.warn('Failed to delete some images from storage:', storageError);
      }

      // Delete from database
      await supabase
        .from('item_images')
        .delete()
        .eq('item_id', itemId);
    }

    // Delete item tags with error handling
    const { error: tagsDeleteError } = await supabase
      .from('item_tags')
      .delete()
      .eq('item_id', itemId);

    if (tagsDeleteError) {
      console.warn('Error deleting item tags:', tagsDeleteError);
    }

    // Finally, delete the item
    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      console.error('Final item deletion error:', deleteError);
      throw deleteError;
    }

    return {
      res_code: 200,
      res_msg: 'Item and all related data deleted successfully'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const getUserItems = async (userId, options = {}) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { page = 1, limit = 20, sort = 'newest' } = options;
    const offset = (page - 1) * limit;

    const { data: items, error: itemsError, count } = await supabase
      .from('items')
      .select(`
        id, title, description, price, status, created_at,
        categories (id, name),
        item_images (id, url)
      `, { count: 'exact' })
      .eq('seller_id', userId)
      .order('created_at', { ascending: sort === 'oldest' })
      .range(offset, offset + limit - 1);

    if (itemsError) throw itemsError;

    const transformedItems = items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      status: item.status || 'selling',
      category: item.categories ? {
        id: item.categories.id,
        name: item.categories.name
      } : null,
      images: item.item_images ? item.item_images.map(img => ({
        id: img.id,
        url: toPublicImageUrl(img.url)
      })) : [],
      created_at: item.created_at
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      res_code: 200,
      res_msg: 'User items retrieved successfully',
      items: transformedItems,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: count,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      meta: {
        sort: sort,
        filters: {}
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

export const addItemImage = async (itemId, imageUrl, sortOrder = 0) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    // Check if user owns the item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', itemId)
      .single();

    if (itemError) {
      return {
        res_code: 404,
        res_msg: 'Item not found'
      };
    }

    if (item.seller_id !== user.id) {
      return {
        res_code: 403,
        res_msg: 'You can only add images to your own items'
      };
    }

    const { data: newImage, error: imageError } = await supabase
      .from('item_images')
      .insert([
        {
          item_id: itemId,
          url: imageUrl,
          sort_order: sortOrder
        }
      ])
      .select()
      .single();

    if (imageError) throw imageError;

    return {
      res_code: 201,
      res_msg: 'Image added successfully',
      image: {
        id: newImage.id,
        url: toPublicImageUrl(newImage.url),
        sort_order: newImage.sort_order
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

export const deleteItemImage = async (imageId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    // Get image info and check ownership
    const { data: image, error: imageError } = await supabase
      .from('item_images')
      .select(`
        id, url, item_id,
        items!inner (seller_id)
      `)
      .eq('id', imageId)
      .single();

    if (imageError) {
      return {
        res_code: 404,
        res_msg: 'Image not found'
      };
    }

    if (image.items.seller_id !== user.id) {
      return {
        res_code: 403,
        res_msg: 'You can only delete images from your own items'
      };
    }

    // Delete from storage
    try {
      await supabase.storage
        .from('item-images')
        .remove([image.url]);
    } catch (storageError) {
      console.warn('Failed to delete from storage:', storageError);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('item_images')
      .delete()
      .eq('id', imageId);

    if (deleteError) throw deleteError;

    return {
      res_code: 200,
      res_msg: 'Image deleted successfully'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message || 'Failed to delete image',
      error: error
    };
  }
};

export const getItemReviews = async (itemId, options = {}) => {
  try {
    const { page = 1, limit = 20, sort = 'newest' } = options;
    const offset = (page - 1) * limit;

    const { data: reviews, error: reviewsError, count } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        users!reviews_reviewer_id_fkey (
          id,
          display_name,
          profile_image_url
        )
      `)
      .eq('item_id', itemId)
      .order('created_at', { ascending: sort === 'oldest' })
      .range(offset, offset + limit - 1);

    if (reviewsError) throw reviewsError;

    const transformedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      reviewer: {
        id: review.users.id,
        display_name: review.users.display_name,
        profile_image_url: review.users.profile_image_url
      }
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      res_code: 200,
      res_msg: 'Item reviews retrieved successfully',
      reviews: transformedReviews,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: count,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      meta: {
        sort: sort,
        filters: {}
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

export const updateItemStatus = async (itemId, status) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    // Validate status
    const validStatuses = ['selling', 'in_transaction', 'sold'];
    if (!validStatuses.includes(status)) {
      return {
        res_code: 400,
        res_msg: 'Invalid status. Must be one of: selling, in_transaction, sold'
      };
    }

    // Check if user owns the item or is admin
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', itemId)
      .single();

    if (itemError) {
      return {
        res_code: 404,
        res_msg: 'Item not found'
      };
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.is_admin || false;

    if (item.seller_id !== user.id && !isAdmin) {
      return {
        res_code: 403,
        res_msg: 'You can only update your own items'
      };
    }

    // Update item status
    const { error: updateError } = await supabase
      .from('items')
      .update({ status })
      .eq('id', itemId);

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: 'Item status updated successfully'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};