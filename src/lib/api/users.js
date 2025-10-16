import { supabase } from '../supabaseClient';

// 1. 현재 사용자 프로필 조회
export const getUserProfile = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    return {
      res_code: 200,
      res_msg: '프로필 조회 성공',
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

// 2. 사용자 프로필 수정
export const updateUserProfile = async (updates) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
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
      res_msg: '프로필이 성공적으로 업데이트되었습니다',
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

// 3. 다른 사용자 프로필 조회
export const getOtherUserProfile = async (userId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
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
      res_msg: '사용자 프로필 조회 성공',
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

// 4. 사용자 게시글 이력 조회
export const getUserPosts = async (userId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
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
      res_msg: '사용자 게시글 조회 성공',
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

// 5. 사용자 판매 이력 조회
export const getUserSales = async (userId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 현재 스키마에는 seller_id가 없으므로, 사용자가 등록한 아이템들을 조회
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, title, price, created_at')
      .eq('id', userId) // 임시로 사용자 ID와 매칭 (실제로는 seller_id 컬럼이 필요)
      .order('created_at', { ascending: false });

    if (itemsError) throw itemsError;

    return {
      res_code: 200,
      res_msg: '사용자 판매 이력 조회 성공',
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        status: 'sold', // 현재 스키마에 status 컬럼이 없으므로 임시값
        created_at: item.created_at,
        buyer_count: 0 // 현재 스키마에 해당 정보가 없음
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

// 6. 사용자 구매 이력 조회
export const getUserPurchases = async (userId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 현재 스키마에는 구매 이력을 저장하는 테이블이 없으므로
    // 임시로 빈 배열 반환 (실제 구현 시에는 구매 테이블이 필요)
    return {
      res_code: 200,
      res_msg: '사용자 구매 이력 조회 성공',
      items: []
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};
