import { supabase } from '../supabaseClient';

// 1. 커뮤니티 목록 조회
export const getCommunities = async () => {
  try {
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select(`
        id,
        name,
        description,
        member_count,
        post_count,
        created_at,
        users!communities_creator_id_fkey (
          id,
          display_name
        )
      `)
      .order('created_at', { ascending: false });

    if (communitiesError) throw communitiesError;

    const transformedCommunities = communities.map(community => ({
      id: community.id,
      name: community.name,
      description: community.description,
      creator: {
        id: community.users.id,
        display_name: community.users.display_name
      },
      member_count: community.member_count,
      post_count: community.post_count,
      created_at: community.created_at
    }));

    return {
      res_code: 200,
      res_msg: '커뮤니티 목록 조회 성공',
      communities: transformedCommunities
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 2. 커뮤니티 생성
export const createCommunity = async (communityData) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { name, description } = communityData;

    const { data: newCommunity, error: communityError } = await supabase
      .from('communities')
      .insert([
        {
          name,
          description,
          creator_id: user.id,
          member_count: 1, // 생성자가 첫 번째 멤버
          post_count: 0
        }
      ])
      .select()
      .single();

    if (communityError) throw communityError;

    return {
      res_code: 201,
      res_msg: '커뮤니티가 성공적으로 생성되었습니다',
      community: newCommunity
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 3. 커뮤니티 게시글 목록 조회
export const getCommunityPosts = async (communityId, filters = {}) => {
  try {
    const {
      page = 1,
      limit = 20
    } = filters;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: posts, error: postsError, count } = await supabase
      .from('community_posts')
      .select(`
        id,
        title,
        content,
        upvotes,
        downvotes,
        comment_count,
        created_at,
        users!community_posts_author_id_fkey (
          id,
          display_name,
          trust_score
        ),
        post_media (
          id,
          media_url,
          media_type,
          display_order
        )
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (postsError) throw postsError;

    const transformedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      author: {
        id: post.users.id,
        display_name: post.users.display_name,
        trust_score: post.users.trust_score
      },
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      comment_count: post.comment_count,
      media: post.post_media ? post.post_media.map(media => ({
        id: media.id,
        media_url: media.media_url,
        media_type: media.media_type,
        display_order: media.display_order
      })) : [],
      created_at: post.created_at
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      res_code: 200,
      res_msg: '커뮤니티 게시글 조회 성공',
      posts: transformedPosts,
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

// 4. 커뮤니티 가입
export const joinCommunity = async (communityId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 현재 스키마에는 community_members 테이블이 없으므로
    // member_count만 증가시키는 것으로 임시 구현
    const { error: updateError } = await supabase
      .from('communities')
      .update({
        member_count: supabase.raw('member_count + 1')
      })
      .eq('id', communityId);

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: '커뮤니티에 가입되었습니다'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 5. 커뮤니티 탈퇴
export const leaveCommunity = async (communityId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 현재 스키마에는 community_members 테이블이 없으므로
    // member_count만 감소시키는 것으로 임시 구현
    const { error: updateError } = await supabase
      .from('communities')
      .update({
        member_count: supabase.raw('member_count - 1')
      })
      .eq('id', communityId);

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: '커뮤니티에서 탈퇴되었습니다'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};
