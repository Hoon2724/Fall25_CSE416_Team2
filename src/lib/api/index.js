// API 함수들을 통합하는 메인 인덱스 파일

// 인증 관련 API
export * from './auth';

// 사용자 관련 API
export * from './users';

// 아이템 관련 API
export * from './items';

// 위시리스트 관련 API
export * from './wishlists';

// 커뮤니티 관련 API
export * from './communities';

// 게시글 관련 API
export * from './posts';

// 댓글 관련 API
export * from './comments';

// 투표 관련 API
export * from './votes';

// 채팅 관련 API
export * from './chat';

// 메시지 관련 API
export * from './messages';

// 검색 및 추천 관련 API
export * from './search';

// 카테고리 관련 API
export * from './categories';

// 리뷰 관련 API
export * from './reviews';

// 알림 관련 API
export * from './notifications';

// 파일 업로드 관련 API
export * from './upload';

// 공통 유틸리티 함수들
export const createApiResponse = (success, data = null, message = '', error = null) => {
  return {
    success,
    data,
    message,
    error
  };
};

export const handleApiError = (error, defaultMessage = '알 수 없는 오류가 발생했습니다') => {
  console.error('API Error:', error);
  
  return createApiResponse(false, null, error.message || defaultMessage, error);
};

// API 응답 형식 표준화
export const standardizeResponse = (response) => {
  if (response.success === undefined) {
    // 기존 API 응답 형식을 새로운 형식으로 변환
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
