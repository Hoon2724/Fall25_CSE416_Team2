import { supabase } from '../supabaseClient';
import {
  getAuthenticatedUser,
  checkAuthorPermission,
  validateInput,
  createErrorResponse,
  createSuccessResponse
} from './authUtils';

const adjustCommentCount = async (postId, delta) => {
  const { data: post, error: fetchError } = await supabase
    .from('community_posts')
    .select('comment_count')
    .eq('id', postId)
    .single();

  if (fetchError) {
    console.warn('[comments] Failed to fetch post for comment_count update', {
      postId,
      error: fetchError
    });
    return;
  }

  const nextCount = Math.max(0, (post?.comment_count ?? 0) + delta);

  const { error: updateError } = await supabase
    .from('community_posts')
    .update({ comment_count: nextCount })
    .eq('id', postId);

  if (updateError) {
    console.warn('[comments] Failed to update comment_count', {
      postId,
      delta,
      attemptedValue: nextCount,
      error: updateError
    });
  }
};


export const createComment = async (postId, commentData) => {
  try {
    const user = await getAuthenticatedUser();
    
    validateInput.uuid(postId);
    const content = validateInput.text(commentData.content, 1000);

    const { data: newComment, error: commentError } = await supabase
      .from('comments')
      .insert([
        {
          post_id: postId,
          content,
          author_id: user.id
        }
      ])
      .select()
      .single();

    if (commentError) throw commentError;

    await adjustCommentCount(postId, 1);

    // Broadcast to post author about new comment
    try {
      const { data: post } = await supabase
        .from('community_posts')
        .select('author_id')
        .eq('id', postId)
        .single();
      const authorId = post?.author_id;
      if (authorId && authorId !== user.id) {
        const channel = supabase.channel(`notify:${authorId}`);
        await channel.subscribe();
        await channel.send({
          type: 'broadcast',
          event: 'notify',
          payload: {
            type: 'comment',
            post_id: postId,
            comment_id: newComment.id,
            title: 'New comment on your post',
            content
          }
        });
        supabase.removeChannel(channel);
      }
    } catch (_) {}

    return createSuccessResponse('Comment created successfully', {
      id: newComment.id,
      content: newComment.content,
      author_id: newComment.author_id,
      post_id: newComment.post_id,
      created_at: newComment.created_at
    });
  } catch (error) {
    return createErrorResponse(400, error.message, error);
  }
};

export const updateComment = async (postId, commentId, content) => {
  try {
    validateInput.uuid(postId);
    validateInput.uuid(commentId);
    const validatedContent = validateInput.text(content, 1000);
    
    await checkAuthorPermission('comments', commentId);
    
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('post_id')
      .eq('id', commentId)
      .single();

    if (commentError) throw commentError;

    if (comment.post_id !== postId) {
      throw new Error('Comment does not belong to this post');
    }

    const { data: updatedComment, error: updateError } = await supabase
      .from('comments')
      .update({
        content: validatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) throw updateError;

    return createSuccessResponse('Comment updated successfully', {
      id: updatedComment.id,
      content: updatedComment.content,
      updated_at: updatedComment.updated_at
    });
  } catch (error) {
    return createErrorResponse(400, error.message, error);
  }
};

export const deleteComment = async (postId, commentId) => {
  try {
    validateInput.uuid(postId);
    validateInput.uuid(commentId);
    
    const { record: comment } = await checkAuthorPermission('comments', commentId);

    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) throw deleteError;

    await adjustCommentCount(comment.post_id, -1);

    return createSuccessResponse('Comment deleted successfully');
  } catch (error) {
    return createErrorResponse(400, error.message, error);
  }
};
