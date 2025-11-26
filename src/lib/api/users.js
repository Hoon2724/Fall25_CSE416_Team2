import { supabase } from '../supabaseClient';

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, display_name, profile_image_url, school_verified, trust_score, total_reviews, is_admin, created_at')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    return {
      res_code: 200,
      res_msg: 'User profile retrieved successfully',
      user: userProfile
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const getUserProfile = getCurrentUser;

export const updateUserProfile = async (updates) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: 'Profile updated successfully',
      user: updatedProfile
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const getOtherUserProfile = async (userId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, display_name, profile_image_url, trust_score, total_reviews, created_at')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    return {
      res_code: 200,
      res_msg: 'User profile retrieved successfully',
      user: userProfile
    };
  } catch (error) {
    return {
      res_code: 404,
      res_msg: error.message,
      error: error
    };
  }
};

export const getUserPosts = async (userId, options = {}) => {
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

    const { data: posts, error: postsError } = await supabase
      .from('community_posts')
      .select(`
        id, title, content, upvotes, comment_count, created_at,
        communities!inner(id, name)
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: sort === 'oldest' })
      .range(offset, offset + limit - 1);

    if (postsError) throw postsError;

    return {
      res_code: 200,
      res_msg: 'User posts retrieved successfully',
      posts: posts,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(posts.length / limit),
        total_count: posts.length,
        has_next: posts.length === limit,
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

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        id, title, price, status, created_at,
        categories(id, name),
        item_images(id, url)
      `)
      .eq('seller_id', userId)
      .order('created_at', { ascending: sort === 'oldest' })
      .range(offset, offset + limit - 1);

    if (itemsError) throw itemsError;

    return {
      res_code: 200,
      res_msg: 'User items retrieved successfully',
      items: items,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(items.length / limit),
        total_count: items.length,
        has_next: items.length === limit,
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

export const getUserWishlists = async (userId, options = {}) => {
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

    const { data: wishlists, error: wishlistsError } = await supabase
      .from('wishlists')
      .select(`
        id, created_at,
        items!inner(id, title, price, status, item_images(id, url))
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: sort === 'oldest' })
      .range(offset, offset + limit - 1);

    if (wishlistsError) throw wishlistsError;

    return {
      res_code: 200,
      res_msg: 'User wishlist retrieved successfully',
      wishlists: wishlists,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(wishlists.length / limit),
        total_count: wishlists.length,
        has_next: wishlists.length === limit,
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

export const getUserReviews = async (userId, options = {}) => {
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

    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id, rating, comment, created_at,
        items!inner(id, title),
        users!reviews_reviewer_id_fkey(id, display_name, profile_image_url)
      `)
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: sort === 'oldest' })
      .range(offset, offset + limit - 1);

    if (reviewsError) throw reviewsError;

    return {
      res_code: 200,
      res_msg: 'User reviews retrieved successfully',
      reviews: reviews,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(reviews.length / limit),
        total_count: reviews.length,
        has_next: reviews.length === limit,
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

export const getUserPurchases = async (userId, options = {}) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { data: posts, error: postsError } = await supabase
      .from('community_posts')
      .select(`
        id,
        title,
        content,
        upvotes,
        comment_count,
        created_at,
        communities (
          name
        )
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (postsError) throw postsError;

    return {
      res_code: 200,
      res_msg: 'User posts retrieved successfully',
      posts: posts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        community: {
          name: post.communities?.name
        },
        upvotes: post.upvotes,
        comment_count: post.comment_count,
        created_at: post.created_at
      }))
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const getUserSales = async (userId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, title, price, created_at')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    if (itemsError) throw itemsError;

    return {
      res_code: 200,
      res_msg: 'User sales history retrieved successfully',
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        status: 'sold', 
        created_at: item.created_at,
        buyer_count: 0 
      }))
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

