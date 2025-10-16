import { supabase } from '../supabaseClient';

// 1. 아이템 검색
export const searchItems = async (searchParams = {}) => {
  try {
    const {
      q = '',
      category,
      min_price,
      max_price,
      sort = 'created_at',
      page = 1,
      limit = 20
    } = searchParams;

    let query = supabase
      .from('items')
      .select(`
        id,
        title,
        description,
        price,
        created_at,
        categories (
          id,
          name
        ),
        item_images (
          url
        )
      `);

    // 검색어 필터
    if (q) {
      query = query.or(`title.ilike.%${q}%, description.ilike.%${q}%`);
    }

    // 카테고리 필터
    if (category) {
      query = query.eq('category_id', category);
    }

    // 가격 범위 필터
    if (min_price !== undefined) {
      query = query.gte('price', min_price);
    }
    if (max_price !== undefined) {
      query = query.lte('price', max_price);
    }

    // 정렬
    switch (sort) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'popular':
        // 현재 스키마에 조회수나 인기도 필드가 없으므로 최신순으로 대체
        query = query.order('created_at', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // 페이지네이션
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: items, error: itemsError, count } = await query;

    if (itemsError) throw itemsError;

    const transformedItems = items.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price,
      seller: {
        display_name: '판매자' // 임시값 (seller_id 컬럼이 없으므로)
      },
      images: item.item_images ? item.item_images.map(img => ({
        image_url: img.url
      })) : []
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      res_code: 200,
      res_msg: '검색 완료',
      items: transformedItems,
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

// 2. 검색 기록 저장
export const saveSearchHistory = async (searchQuery) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 중복 검색어 체크 (최근 1시간 내 같은 검색어가 있으면 저장하지 않음)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentSearch, error: checkError } = await supabase
      .from('search_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('search_query', searchQuery)
      .gte('created_at', oneHourAgo)
      .single();

    if (recentSearch) {
      return {
        res_code: 200,
        res_msg: '최근 검색 기록이 있어 저장하지 않습니다'
      };
    }

    const { data: searchHistory, error: searchError } = await supabase
      .from('search_history')
      .insert([
        {
          user_id: user.id,
          search_query: searchQuery
        }
      ])
      .select()
      .single();

    if (searchError) throw searchError;

    return {
      res_code: 201,
      res_msg: '검색 기록이 저장되었습니다',
      search_history: searchHistory
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 3. 검색 기록 조회
export const getSearchHistory = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { data: searchHistory, error: historyError } = await supabase
      .from('search_history')
      .select('id, search_query, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (historyError) throw historyError;

    return {
      res_code: 200,
      res_msg: '검색 기록 조회 성공',
      search_history: searchHistory
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 4. 개별 검색 기록 삭제
export const deleteSearchHistory = async (historyId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { error: deleteError } = await supabase
      .from('search_history')
      .delete()
      .eq('id', historyId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return {
      res_code: 200,
      res_msg: '검색 기록이 삭제되었습니다'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 5. 모든 검색 기록 삭제
export const clearAllSearchHistory = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { error: deleteError } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return {
      res_code: 200,
      res_msg: '모든 검색 기록이 삭제되었습니다'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 6. 추천 아이템 조회 (간단한 구현)
export const getRecommendedItems = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 현재는 간단하게 최신 아이템들을 추천으로 반환
    // 실제로는 사용자의 검색 기록, 관심사 등을 기반으로 추천 알고리즘 구현 필요
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        id,
        title,
        price,
        item_images (
          url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (itemsError) throw itemsError;

    const transformedItems = items.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price,
      seller: {
        display_name: '판매자' // 임시값
      },
      images: item.item_images ? item.item_images.map(img => ({
        image_url: img.url
      })) : []
    }));

    return {
      res_code: 200,
      res_msg: '추천 아이템 조회 성공',
      items: transformedItems
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};
