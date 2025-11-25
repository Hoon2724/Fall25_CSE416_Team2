import { supabase } from '../supabaseClient';

export const createReview = async (reviewData) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { reviewee_id, item_id, rating, comment } = reviewData;

    if (reviewee_id === user.id) {
      return {
        res_code: 400,
        res_msg: 'You cannot leave a review for yourself'
      };
    }

    // Check if the item belongs to the current user
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', item_id)
      .single();

    if (itemError) {
      return {
        res_code: 400,
        res_msg: 'Item not found'
      };
    }

    if (item.seller_id === user.id) {
      return {
        res_code: 400,
        res_msg: 'You cannot leave a review for your own item'
      };
    }

    // Validate rating: 1-5 range, 0.5 increments
    if (rating < 1 || rating > 5) {
      return {
        res_code: 400,
        res_msg: 'Rating must be between 1 and 5'
      };
    }
    
    // Check if rating is in 0.5 increments
    const ratingRounded = Math.round(rating * 2) / 2;
    if (Math.abs(rating - ratingRounded) > 0.01) {
      return {
        res_code: 400,
        res_msg: 'Rating must be in 0.5 increments (e.g., 1.0, 1.5, 2.0, etc.)'
      };
    }

    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('reviewer_id', user.id)
      .eq('reviewee_id', reviewee_id)
      .eq('item_id', item_id)
      .single();

    if (existingReview) {
      return {
        res_code: 409,
        res_msg: 'You have already reviewed this item'
      };
    }

       
    const { data: newReview, error: reviewError } = await supabase
      .from('reviews')
      .insert([
        {
          reviewer_id: user.id,
          reviewee_id,
          item_id,
          rating,
          comment
        }
      ])
      .select()
      .single();

    if (reviewError) throw reviewError;

    // Update total_reviews count
    const { data: currentUser, error: userFetchError } = await supabase
      .from('users')
      .select('total_reviews')
      .eq('id', reviewee_id)
      .single();

    if (!userFetchError && currentUser) {
      const nextCount = (currentUser.total_reviews ?? 0) + 1;
      await supabase
        .from('users')
        .update({ total_reviews: nextCount })
        .eq('id', reviewee_id);
    }

    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', reviewee_id);

    if (!reviewsError && reviews.length > 0) {
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      
      await supabase
        .from('users')
        .update({
          trust_score: Math.round(averageRating * 10) / 10 
        })
        .eq('id', reviewee_id);
    }

    return {
      res_code: 201,
      res_msg: 'Review created successfully',
      review: newReview
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const getUserReviews = async (userId) => {
  try {
    // First get reviews
    console.log('Searching for reviews with reviewer_id:', userId); // 디버깅용
    
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        reviewer_id,
        reviewee_id,
        item_id
      `)
      .eq('reviewer_id', userId)
      .order('created_at', { ascending: false });

    if (reviewsError) throw reviewsError;

    console.log('Raw reviews data:', reviews); // 디버깅용
    
    // 디버깅: 모든 리뷰 확인
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('id, reviewer_id, reviewee_id, item_id');
    console.log('All reviews in database:', allReviews);

    // Get unique reviewee IDs and item IDs (since we're showing reviews I wrote)
    const revieweeIds = [...new Set(reviews.map(r => r.reviewee_id).filter(Boolean))];
    const itemIds = [...new Set(reviews.map(r => r.item_id).filter(Boolean))];

    // Get reviewee information (people I reviewed)
    let revieweesMap = new Map();
    if (revieweeIds.length > 0) {
      const { data: reviewees, error: revieweesError } = await supabase
        .from('users')
        .select('id, display_name, profile_image_url')
        .in('id', revieweeIds);

      if (!revieweesError && reviewees) {
        revieweesMap = new Map(reviewees.map(user => [user.id, user]));
      }
    }

    // Get item information
    let itemsMap = new Map();
    if (itemIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, title')
        .in('id', itemIds);

      if (!itemsError && items) {
        itemsMap = new Map(items.map(item => [item.id, item]));
      }
    }

    const transformedReviews = reviews.map(review => {
      const reviewee = revieweesMap.get(review.reviewee_id);
      const item = itemsMap.get(review.item_id);

      return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        item: item ? {
          id: item.id,
          title: item.title
        } : null,
        reviewee: reviewee ? {
          id: reviewee.id,
          display_name: reviewee.display_name,
          profile_image_url: reviewee.profile_image_url
        } : {
          id: review.reviewee_id,
          display_name: 'Unknown User',
          profile_image_url: null
        }
      };
    });

    console.log('Transformed reviews:', transformedReviews); // 디버깅용

    return {
      res_code: 200,
      res_msg: 'User reviews retrieved successfully',
      reviews: transformedReviews
    };
  } catch (error) {
    console.error('Error in getUserReviews:', error);
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const getItemReviews = async (itemId) => {
  try {
    const { data: reviews, error: reviewsError } = await supabase
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
      .order('created_at', { ascending: false });

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

    return {
      res_code: 200,
      res_msg: 'Item reviews retrieved successfully',
      reviews: transformedReviews
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const getUserWrittenReviews = async (userId) => {
  try {
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        items (
          id,
          title,
          item_images (
            id,
            url
          )
        ),
        users!reviews_reviewee_id_fkey (
          id,
          display_name,
          profile_image_url
        )
      `)
      .eq('reviewer_id', userId)
      .order('created_at', { ascending: false });

    if (reviewsError) throw reviewsError;

    const transformedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      item: review.items ? {
        id: review.items.id,
        title: review.items.title,
        image_url: review.items.item_images && review.items.item_images.length > 0 
          ? review.items.item_images[0].url 
          : null
      } : null,
      reviewee: {
        id: review.users.id,
        display_name: review.users.display_name,
        profile_image_url: review.users.profile_image_url
      }
    }));

    return {
      res_code: 200,
      res_msg: 'User written reviews retrieved successfully',
      reviews: transformedReviews
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const getReviewStats = async (userId) => {
  try {
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', userId);

    if (reviewsError) throw reviewsError;

    if (reviews.length === 0) {
      return {
        res_code: 200,
        res_msg: 'Review stats retrieved successfully',
        stats: {
          total_reviews: 0,
          average_rating: 0,
          rating_distribution: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
          }
        }
      };
    }

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
    
    const ratingDistribution = reviews.reduce((dist, review) => {
      dist[review.rating] = (dist[review.rating] || 0) + 1;
      return dist;
    }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    return {
      res_code: 200,
      res_msg: 'Review stats retrieved successfully',
      stats: {
        total_reviews: totalReviews,
        average_rating: Math.round(averageRating * 10) / 10,
        rating_distribution: ratingDistribution
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


