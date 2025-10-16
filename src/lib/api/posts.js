import { supabase } from '../supabaseClient';

// 1. 게시글 상세 조회 (댓글 포함)
export const getPostDetails = async (postId) => {
  try {
    const { data: post, error: postError } = await supabase
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
          trust_score
        ),
        post_media (
          id,
          media_url,
          media_type
        ),
        comments (
          id,
          content,
          created_at,
          users!comments_author_id_fkey (
            display_name
          )
        )
      `)
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    const transformedPost = {
      id: post.id,
      title: post.title,
      content: post.content,
      author: {
        id: post.users.id,
        display_name: post.users.display_name,
        trust_score: post.users.trust_score
      },
      community: {
        id: post.communities.id,
        name: post.communities.name
      },
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      comment_count: post.comment_count,
      media: post.post_media ? post.post_media.map(media => ({
        id: media.id,
        media_url: media.media_url,
        media_type: media.media_type
      })) : [],
      comments: post.comments ? post.comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        author: {
          display_name: comment.users.display_name
        },
        created_at: comment.created_at
      })) : [],
      created_at: post.created_at
    };

    return {
      res_code: 200,
      res_msg: '게시글 상세 조회 성공',
      post: transformedPost
    };
  } catch (error) {
    return {
      res_code: 404,
      res_msg: error.message,
      error: error
    };
  }
};

// 2. 게시글 생성
export const createPost = async (postData) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { community_id, title, content, media } = postData;

    // 게시글 생성
    const { data: newPost, error: postError } = await supabase
      .from('community_posts')
      .insert([
        {
          community_id,
          title,
          content,
          author_id: user.id,
          upvotes: 0,
          downvotes: 0,
          comment_count: 0
        }
      ])
      .select()
      .single();

    if (postError) throw postError;

    // 미디어 저장
    if (media && media.length > 0) {
      const mediaData = media.map(item => ({
        post_id: newPost.id,
        media_url: item.media_url,
        media_type: item.media_type,
        display_order: item.display_order
      }));

      const { error: mediaError } = await supabase
        .from('post_media')
        .insert(mediaData);

      if (mediaError) throw mediaError;
    }

    // 커뮤니티의 post_count 증가
    await supabase
      .from('communities')
      .update({
        post_count: supabase.raw('post_count + 1')
      })
      .eq('id', community_id);

    return {
      res_code: 201,
      res_msg: '게시글이 성공적으로 생성되었습니다',
      post: {
        id: newPost.id,
        title: newPost.title,
        content: newPost.content,
        author_id: newPost.author_id,
        community_id: newPost.community_id,
        created_at: newPost.created_at
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

// 3. 게시글 수정
export const updatePost = async (postId, updates) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 작성자 권한 확인
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    if (post.author_id !== user.id) {
      return {
        res_code: 403,
        res_msg: '게시글을 수정할 권한이 없습니다'
      };
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from('community_posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: '게시글이 성공적으로 수정되었습니다',
      post: {
        id: updatedPost.id,
        title: updatedPost.title,
        content: updatedPost.content,
        updated_at: updatedPost.updated_at
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

// 4. 게시글 삭제
export const deletePost = async (postId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 작성자 권한 확인
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('author_id, community_id')
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    if (post.author_id !== user.id) {
      return {
        res_code: 403,
        res_msg: '게시글을 삭제할 권한이 없습니다'
      };
    }

    // 관련 데이터 삭제
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

    // 게시글 삭제
    const { error: deleteError } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId);

    if (deleteError) throw deleteError;

    // 커뮤니티의 post_count 감소
    await supabase
      .from('communities')
      .update({
        post_count: supabase.raw('post_count - 1')
      })
      .eq('id', post.community_id);

    return {
      res_code: 200,
      res_msg: '게시글이 성공적으로 삭제되었습니다'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};
