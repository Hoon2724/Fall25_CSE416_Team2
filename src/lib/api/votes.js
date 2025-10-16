import { supabase } from '../supabaseClient';

// 1. 게시글 투표 (upvote/downvote)
export const voteOnPost = async (voteData) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { post_id, vote_type } = voteData;

    // vote_type 검증
    if (!['upvote', 'downvote'].includes(vote_type)) {
      return {
        res_code: 400,
        res_msg: '유효하지 않은 투표 타입입니다 (upvote 또는 downvote)'
      };
    }

    // 기존 투표 확인
    const { data: existingVote, error: checkError } = await supabase
      .from('post_votes')
      .select('id, vote_type')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .single();

    let voteResult;

    if (existingVote) {
      // 기존 투표가 있는 경우
      if (existingVote.vote_type === vote_type) {
        // 같은 투표를 다시 하는 경우 - 투표 취소
        await supabase
          .from('post_votes')
          .delete()
          .eq('id', existingVote.id);

        // 게시글 투표 수 감소
        const updateField = vote_type === 'upvote' ? 'upvotes' : 'downvotes';
        await supabase
          .from('community_posts')
          .update({
            [updateField]: supabase.raw(`${updateField} - 1`)
          })
          .eq('id', post_id);

        voteResult = null;
      } else {
        // 다른 투표로 변경하는 경우 - 기존 투표 수정
        const { data: updatedVote, error: updateError } = await supabase
          .from('post_votes')
          .update({
            vote_type
          })
          .eq('id', existingVote.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // 게시글 투표 수 업데이트
        const oldField = existingVote.vote_type === 'upvote' ? 'upvotes' : 'downvotes';
        const newField = vote_type === 'upvote' ? 'upvotes' : 'downvotes';

        await supabase
          .from('community_posts')
          .update({
            [oldField]: supabase.raw(`${oldField} - 1`),
            [newField]: supabase.raw(`${newField} + 1`)
          })
          .eq('id', post_id);

        voteResult = updatedVote;
      }
    } else {
      // 새로운 투표 생성
      const { data: newVote, error: createError } = await supabase
        .from('post_votes')
        .insert([
          {
            post_id,
            user_id: user.id,
            vote_type
          }
        ])
        .select()
        .single();

      if (createError) throw createError;

      // 게시글 투표 수 증가
      const updateField = vote_type === 'upvote' ? 'upvotes' : 'downvotes';
      await supabase
        .from('community_posts')
        .update({
          [updateField]: supabase.raw(`${updateField} + 1`)
        })
        .eq('id', post_id);

      voteResult = newVote;
    }

    return {
      res_code: 200,
      res_msg: voteResult ? '투표가 성공적으로 처리되었습니다' : '투표가 취소되었습니다',
      vote: voteResult
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 2. 사용자의 게시글 투표 상태 확인
export const getUserVote = async (postId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { data: vote, error: voteError } = await supabase
      .from('post_votes')
      .select('vote_type')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    return {
      res_code: 200,
      res_msg: '투표 상태 확인 완료',
      vote_type: vote ? vote.vote_type : null
    };
  } catch (error) {
    return {
      res_code: 200,
      res_msg: '투표 상태 확인 완료',
      vote_type: null
    };
  }
};
