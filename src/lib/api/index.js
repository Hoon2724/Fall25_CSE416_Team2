
export { 
  signInWithGoogle,
  signOut
} from './auth';


export {
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  getOtherUserProfile,
  getUserPosts,
  getUserItems,
  getUserWishlists,
  getUserReviews,
  getUserPurchases,
  getUserSales
} from './users';


export {
  getItems,
  getLatestItems,
  getItemDetails,
  createItem,
  updateItem,
  deleteItem,
  getItemReviews
} from './items';

export * from './wishlists';

export * from './communities';

export * from './posts';

export * from './comments';

export * from './votes';

export * from './chat';

export * from './messages';

export * from './search';

export * from './categories';

export {
  createReview,
  getReviewStats
} from './reviews';

export * from './notifications';

export * from './chatRealtime';

export * from './history';

export {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  getUserImages
} from './upload';

export * from './admin';

export const createApiResponse = (success, data = null, message = '', error = null) => {
  return {
    success,
    data,
    message,
    error
  };
};

export const handleApiError = (error, defaultMessage = 'An unknown error occurred') => {
  console.error('API Error:', error);
  
  return createApiResponse(false, null, error.message || defaultMessage, error);
};

export const standardizeResponse = (response) => {
  if (response.success === undefined) {
    return {
      success: response.res_code >= 200 && response.res_code < 300,
      data: response.data || response.user || response.item || response.items || response.post || response.posts || response.message || response.notification || response.notifications || response.review || response.reviews || response.category || response.categories || response.chat_room || response.chat_rooms || response.message || response.messages || response.wishlist || response.wishlists || response.community || response.communities || response.comment || response.comments || response.vote || response.search_history || response.images || response.image_url,
      message: response.res_msg || response.message || '',
      error: response.error || null,
      pagination: response.pagination || null,
      unread_count: response.unread_count || null
    };
  }
  
  return response;
};
