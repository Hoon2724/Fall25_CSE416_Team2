import { supabase } from '../supabaseClient';

// 관리자 권한 확인 헬퍼 함수
const checkAdminPermission = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return { isAdmin: false, error: 'Authentication required' };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    if (!userProfile?.is_admin) {
      return { isAdmin: false, error: 'Admin permission required' };
    }

    return { isAdmin: true, user };
  } catch (error) {
    return { isAdmin: false, error: error.message };
  }
};

// ==================== 사용자 관리 ====================

// 모든 사용자 조회
export const getAllUsers = async (options = {}) => {
  try {
    const adminCheck = await checkAdminPermission();
    if (!adminCheck.isAdmin) {
      return {
        res_code: 403,
        res_msg: adminCheck.error || 'Admin permission required'
      };
    }

    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, display_name, profile_image_url, school_verified, trust_score, total_reviews, is_admin, created_at', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%, display_name.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: users, error: usersError, count } = await query;

    if (usersError) throw usersError;

    return {
      res_code: 200,
      res_msg: 'Users retrieved successfully',
      users: users || [],
      pagination: {
        current_page: page,
        total_pages: Math.ceil((count || 0) / limit),
        total_count: count || 0,
        has_next: page < Math.ceil((count || 0) / limit),
        has_prev: page > 1
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

// 사용자 삭제
export const deleteUser = async (userId) => {
  try {
    const adminCheck = await checkAdminPermission();
    if (!adminCheck.isAdmin) {
      return {
        res_code: 403,
        res_msg: adminCheck.error || 'Admin permission required'
      };
    }

    // 자기 자신은 삭제할 수 없도록 체크
    if (adminCheck.user.id === userId) {
      return {
        res_code: 400,
        res_msg: 'Cannot delete your own account'
      };
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) throw deleteError;

    return {
      res_code: 200,
      res_msg: 'User deleted successfully'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 사용자 정보 수정 (관리자용)
export const updateUserByAdmin = async (userId, updates) => {
  try {
    const adminCheck = await checkAdminPermission();
    if (!adminCheck.isAdmin) {
      return {
        res_code: 403,
        res_msg: adminCheck.error || 'Admin permission required'
      };
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: 'User updated successfully',
      user: updatedUser
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// ==================== 커뮤니티 포스트 관리 ====================

// 모든 커뮤니티 포스트 조회
export const getAllPosts = async (options = {}) => {
  try {
    const adminCheck = await checkAdminPermission();
    if (!adminCheck.isAdmin) {
      return {
        res_code: 403,
        res_msg: adminCheck.error || 'Admin permission required'
      };
    }

    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('community_posts')
      .select(`
        id,
        title,
        content,
        upvotes,
        downvotes,
        comment_count,
        created_at,
        communities (
          id,
          name
        ),
        users!community_posts_author_id_fkey (
          id,
          display_name,
          email
        )
      `, { count: 'exact' });

    if (search) {
      query = query.or(`title.ilike.%${search}%, content.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: posts, error: postsError, count } = await query;

    if (postsError) throw postsError;

    const transformedPosts = (posts || []).map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      comment_count: post.comment_count,
      community: post.communities ? {
        id: post.communities.id,
        name: post.communities.name
      } : null,
      author: post.users ? {
        id: post.users.id,
        display_name: post.users.display_name,
        email: post.users.email
      } : null,
      created_at: post.created_at
    }));

    return {
      res_code: 200,
      res_msg: 'Posts retrieved successfully',
      posts: transformedPosts,
      pagination: {
        current_page: page,
        total_pages: Math.ceil((count || 0) / limit),
        total_count: count || 0,
        has_next: page < Math.ceil((count || 0) / limit),
        has_prev: page > 1
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

// 포스트 삭제 (관리자용)
export const deletePostByAdmin = async (postId) => {
  try {
    console.log('deletePostByAdmin called with postId:', postId);
    const adminCheck = await checkAdminPermission();
    console.log('Admin check result:', adminCheck);
    if (!adminCheck.isAdmin) {
      console.log('Admin permission denied');
      return {
        res_code: 403,
        res_msg: adminCheck.error || 'Admin permission required'
      };
    }

    // 관련 데이터 먼저 삭제
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('community_id')
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    await supabase
      .from('comments')
      .delete()
      .eq('post_id', postId);

    await supabase
      .from('post_media')
      .delete()
      .eq('post_id', postId);

    await supabase
      .from('post_votes')
      .delete()
      .eq('post_id', postId);

    const { error: deleteError } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId);

    if (deleteError) throw deleteError;

    // 커뮤니티 포스트 카운트 업데이트
    if (post.community_id) {
      const { data: community } = await supabase
        .from('communities')
        .select('post_count')
        .eq('id', post.community_id)
        .single();

      if (community) {
        const nextCount = Math.max(0, (community.post_count || 1) - 1);
        await supabase
          .from('communities')
          .update({ post_count: nextCount })
          .eq('id', post.community_id);
      }
    }

    console.log('Post deleted successfully');
    return {
      res_code: 200,
      res_msg: 'Post deleted successfully'
    };
  } catch (error) {
    console.error('Error in deletePostByAdmin:', error);
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// ==================== 마켓 아이템 관리 ====================

// 모든 마켓 아이템 조회
export const getAllItems = async (options = {}) => {
  try {
    const adminCheck = await checkAdminPermission();
    if (!adminCheck.isAdmin) {
      return {
        res_code: 403,
        res_msg: adminCheck.error || 'Admin permission required'
      };
    }

    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('items')
      .select(`
        id,
        title,
        description,
        price,
        created_at,
        categories (
          id,
          name
        ),
        users!items_seller_id_fkey (
          id,
          display_name,
          email
        ),
        item_images (
          id,
          url
        )
      `, { count: 'exact' });

    if (search) {
      query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: items, error: itemsError, count } = await query;

    if (itemsError) throw itemsError;

    const transformedItems = (items || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      category: item.categories ? {
        id: item.categories.id,
        name: item.categories.name
      } : null,
      seller: item.users ? {
        id: item.users.id,
        display_name: item.users.display_name,
        email: item.users.email
      } : null,
      images: item.item_images || [],
      created_at: item.created_at
    }));

    return {
      res_code: 200,
      res_msg: 'Items retrieved successfully',
      items: transformedItems,
      pagination: {
        current_page: page,
        total_pages: Math.ceil((count || 0) / limit),
        total_count: count || 0,
        has_next: page < Math.ceil((count || 0) / limit),
        has_prev: page > 1
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

// 아이템 삭제 (관리자용)
export const deleteItemByAdmin = async (itemId) => {
  try {
    const adminCheck = await checkAdminPermission();
    if (!adminCheck.isAdmin) {
      return {
        res_code: 403,
        res_msg: adminCheck.error || 'Admin permission required'
      };
    }

    // 관련 데이터 먼저 삭제
    await supabase
      .from('item_images')
      .delete()
      .eq('item_id', itemId);

    await supabase
      .from('wishlists')
      .delete()
      .eq('item_id', itemId);

    await supabase
      .from('reviews')
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

