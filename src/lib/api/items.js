import { supabase } from '../supabaseClient';

const toPublicImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  try {
    // Our app uploads to the 'items' bucket from ItemPost
    const { data } = supabase.storage.from('items').getPublicUrl(url);
    return data?.publicUrl || url;
  } catch {
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

    const transformedItems = items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      category: item.category || item.categories?.name || null,
      category_id: item.category_id,
      seller: {
        id: item.seller_id,
        display_name: item.users?.display_name || 'Seller',
        trust_score: item.users?.trust_score || 0.0
      },
      images: item.item_images ? item.item_images.map(img => ({
        id: img.id,
        url: toPublicImageUrl(img.url)
      })) : [],
      created_at: item.created_at
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      res_code: 200,
      res_msg: 'Items list retrieved successfully',
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
          category: category,
          search: search,
          price_min: price_min,
          price_max: price_max
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

export const getLatestItems = async (limit = 20) => {
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
          seller_id: user.id
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

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;

    if (item.seller_id !== user.id) {
      return {
        res_code: 403,
        res_msg: 'No permission to modify this item'
      };
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: 'Item updated successfully',
      item: {
        id: updatedItem.id,
        title: updatedItem.title,
        description: updatedItem.description,
        price: updatedItem.price,
        updated_at: updatedItem.updated_at
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

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;

    if (item.seller_id !== user.id) {
      return {
        res_code: 403,
        res_msg: 'No permission to delete this item'
      };
    }

    await supabase
      .from('item_images')
      .delete()
      .eq('item_id', itemId);

    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (deleteError) throw deleteError;

    return {
      res_code: 200,
      res_msg: 'Item deleted successfully'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
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
