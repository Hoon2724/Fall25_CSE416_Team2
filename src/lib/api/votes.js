import { supabase } from '../supabaseClient';
import {
  getAuthenticatedUser,
  validateInput,
  createErrorResponse,
  createSuccessResponse
} from './authUtils';

const adjustPostVoteCounters = async (postId, adjustments) => {
  const fields = Object.keys(adjustments);
  if (fields.length === 0) return;

  const { data: post, error: fetchError } = await supabase
    .from('community_posts')
    .select(fields.join(','))
    .eq('id', postId)
    .single();

  if (fetchError) {
    console.warn('[votes] Failed to fetch post for vote counter update', {
      postId,
      adjustments,
      error: fetchError
    });
    return;
  }

  const updatePayload = {};
  fields.forEach((field) => {
    const current = post?.[field] ?? 0;
    const next = current + adjustments[field];
    updatePayload[field] = next < 0 ? 0 : next;
  });

  const { error: updateError } = await supabase
    .from('community_posts')
    .update(updatePayload)
    .eq('id', postId);

  if (updateError) {
    console.warn('[votes] Failed to update vote counters', {
      postId,
      adjustments,
      attemptedPayload: updatePayload,
      error: updateError
    });
  }
};

export const voteOnPost = async (postId, voteData) => {
  try {
    const user = await getAuthenticatedUser();
    
    validateInput.uuid(postId);
    const { vote_type } = voteData;

    if (!['upvote', 'downvote'].includes(vote_type)) {
      throw new Error('Invalid vote type (must be upvote or downvote)');
    }

    const { data: existingVote, error: checkError } = await supabase
      .from('post_votes')
      .select('id, vote_type')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    let voteResult;

    if (existingVote) {
      if (existingVote.vote_type === vote_type) {
        await supabase
          .from('post_votes')
          .delete()
          .eq('id', existingVote.id);

        const updateField = vote_type === 'upvote' ? 'upvotes' : 'downvotes';
        await adjustPostVoteCounters(postId, { [updateField]: -1 });

        voteResult = null;
      } else {
        const { data: updatedVote, error: updateError } = await supabase
          .from('post_votes')
          .update({
            vote_type
          })
          .eq('id', existingVote.id)
          .select()
          .single();

        if (updateError) throw updateError;

        const oldField = existingVote.vote_type === 'upvote' ? 'upvotes' : 'downvotes';
        const newField = vote_type === 'upvote' ? 'upvotes' : 'downvotes';

        await adjustPostVoteCounters(postId, {
          [oldField]: -1,
          [newField]: 1
        });

        voteResult = updatedVote;
      }
    } else {
      const { data: newVote, error: createError } = await supabase
        .from('post_votes')
        .insert([
          {
            post_id: postId,
            user_id: user.id,
            vote_type
          }
        ])
        .select()
        .single();

      if (createError) throw createError;

      const updateField = vote_type === 'upvote' ? 'upvotes' : 'downvotes';
      await adjustPostVoteCounters(postId, { [updateField]: 1 });

      voteResult = newVote;
    }

    return createSuccessResponse(
      voteResult ? 'Vote processed successfully' : 'Vote removed',
      voteResult
    );
  } catch (error) {
    return createErrorResponse(400, error.message, error);
  }
};

export const getPostVotes = async (postId) => {
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
      .select('upvotes, downvotes')
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    const { data: userVote, error: voteError } = await supabase
      .from('post_votes')
      .select('vote_type')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (voteError && voteError.code !== 'PGRST116') {
      throw voteError;
    }

    return {
      res_code: 200,
      res_msg: 'Vote status retrieved successfully',
      votes: {
        upvotes: post.upvotes,
        downvotes: post.downvotes,
        user_vote: userVote ? userVote.vote_type : null
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

export const getUserVote = async (postId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { data: vote, error: voteError } = await supabase
      .from('post_votes')
      .select('vote_type')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (voteError && voteError.code !== 'PGRST116') {
      throw voteError;
    }

    return {
      res_code: 200,
      res_msg: 'Vote check complete',
      vote_type: vote ? vote.vote_type : null
    };
  } catch (error) {
    return {
      res_code: 200,
      res_msg: 'Vote check complete',
      vote_type: null
    };
  }
};
