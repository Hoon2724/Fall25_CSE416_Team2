import { supabase } from '../supabaseClient';

// 1. 댓글 생성
export const createComment = async (commentData) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { post_id, content } = commentData;

    // 댓글 생성
    const { data: newComment, error: commentError } = await supabase
      .from('comments')
      .insert([
        {
          post_id,
          content,
          author_id: user.id
        }
      ])
      .select()
      .single();

    if (commentError) throw commentError;

    // 게시글의 comment_count 증가
    await supabase
      .from('community_posts')
      .update({
        comment_count: supabase.raw('comment_count + 1')
      })
      .eq('id', post_id);

    return {
      res_code: 201,
      res_msg: '댓글이 성공적으로 생성되었습니다',
      comment: {
        id: newComment.id,
        content: newComment.content,
        author_id: newComment.author_id,
        post_id: newComment.post_id,
        created_at: newComment.created_at
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

// 2. 댓글 수정
export const updateComment = async (commentId, content) => {
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
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', commentId)
      .single();

    if (commentError) throw commentError;

    if (comment.author_id !== user.id) {
      return {
        res_code: 403,
        res_msg: '댓글을 수정할 권한이 없습니다'
      };
    }

    const { data: updatedComment, error: updateError } = await supabase
      .from('comments')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: '댓글이 성공적으로 수정되었습니다',
      comment: {
        id: updatedComment.id,
        content: updatedComment.content,
        updated_at: updatedComment.updated_at
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

// 3. 댓글 삭제
export const deleteComment = async (commentId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 작성자 권한 확인 및 post_id 가져오기
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('author_id, post_id')
      .eq('id', commentId)
      .single();

    if (commentError) throw commentError;

    if (comment.author_id !== user.id) {
      return {
        res_code: 403,
        res_msg: '댓글을 삭제할 권한이 없습니다'
      };
    }

    // 댓글 삭제
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) throw deleteError;

    // 게시글의 comment_count 감소
    await supabase
      .from('community_posts')
      .update({
        comment_count: supabase.raw('comment_count - 1')
      })
      .eq('id', comment.post_id);

    return {
      res_code: 200,
      res_msg: '댓글이 성공적으로 삭제되었습니다'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};
