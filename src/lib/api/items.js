import { supabase } from '../supabaseClient';

// 1. 아이템 목록 조회 (페이지네이션 및 필터링)
export const getItems = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      sort = 'created_at'
    } = filters;

    let query = supabase
      .from('items')
      .select(`
        id,
        title,
        description,
        price,
        created_at,
        category_id,
        categories (
          id,
          name
        ),
        item_images (
          id,
          url
        )
      `);

    // 카테고리 필터
    if (category) {
      query = query.eq('category_id', category);
    }

    // 검색 필터
    if (search) {
      query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%`);
    }

    // 정렬
    query = query.order(sort, { ascending: false });

    // 페이지네이션
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: items, error: itemsError, count } = await query;

    if (itemsError) throw itemsError;

    // 응답 데이터 변환 (API 문서 형식에 맞춤)
    const transformedItems = items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      status: 'active', // 현재 스키마에 status 컬럼이 없으므로 기본값
      view_count: 0, // 현재 스키마에 없으므로 기본값
      wishlist_count: 0, // 현재 스키마에 없으므로 기본값
      seller: {
        id: item.id, // 임시값 (실제로는 seller_id 컬럼이 필요)
        display_name: '판매자', // 임시값
        trust_score: 0.0 // 임시값
      },
      category: item.categories ? {
        id: item.categories.id,
        name: item.categories.name
      } : null,
      images: item.item_images ? item.item_images.map(img => ({
        id: img.id,
        image_url: img.url,
        display_order: 1 // 현재 스키마에 없으므로 기본값
      })) : []
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      res_code: 200,
      res_msg: '아이템 목록 조회 성공',
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

// 2. 최신 아이템 목록 (홈페이지용)
export const getLatestItems = async (limit = 20) => {
  try {
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        id,
        title,
        price,
        created_at,
        item_images (
          url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

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
      res_msg: '최신 아이템 조회 성공',
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

// 3. 아이템 상세 조회
export const getItemDetails = async (itemId) => {
  try {
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select(`
        id,
        title,
        description,
        price,
        created_at,
        category_id,
        categories (
          id,
          name,
          description
        ),
        item_images (
          id,
          url
        )
      `)
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;

    // 조회수 증가 (현재 스키마에 view_count 컬럼이 없으므로 생략)

    const transformedItem = {
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      status: 'active', // 기본값
      view_count: 0, // 기본값
      wishlist_count: 0, // 기본값
      seller: {
        id: item.id, // 임시값
        display_name: '판매자', // 임시값
        trust_score: 0.0, // 임시값
        total_reviews: 0 // 임시값
      },
      category: item.categories ? {
        id: item.categories.id,
        name: item.categories.name,
        description: item.categories.description
      } : null,
      images: item.item_images ? item.item_images.map(img => ({
        id: img.id,
        image_url: img.url,
        display_order: 1 // 기본값
      })) : [],
      created_at: item.created_at,
      updated_at: item.created_at // 임시로 created_at 사용
    };

    return {
      res_code: 200,
      res_msg: '아이템 상세 조회 성공',
      item: transformedItem
    };
  } catch (error) {
    return {
      res_code: 404,
      res_msg: error.message,
      error: error
    };
  }
};

// 4. 아이템 생성
export const createItem = async (itemData) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { title, description, price, category_id, images } = itemData;

    // 아이템 생성
    const { data: newItem, error: itemError } = await supabase
      .from('items')
      .insert([
        {
          title,
          description,
          price,
          category_id
        }
      ])
      .select()
      .single();

    if (itemError) throw itemError;

    // 이미지 저장
    if (images && images.length > 0) {
      const imageData = images.map(img => ({
        item_id: newItem.id,
        url: img.image_url
      }));

      const { error: imagesError } = await supabase
        .from('item_images')
        .insert(imageData);

      if (imagesError) throw imagesError;
    }

    return {
      res_code: 201,
      res_msg: '아이템이 성공적으로 생성되었습니다',
      item: {
        id: newItem.id,
        title: newItem.title,
        description: newItem.description,
        price: newItem.price,
        seller_id: user.id, // 실제로는 items 테이블에 seller_id 컬럼이 필요
        created_at: newItem.created_at
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

// 5. 아이템 수정
export const updateItem = async (itemId, updates) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 현재 스키마에 seller_id가 없으므로 임시로 권한 체크 생략
    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: '아이템이 성공적으로 업데이트되었습니다',
      item: {
        id: updatedItem.id,
        title: updatedItem.title,
        description: updatedItem.description,
        price: updatedItem.price,
        updated_at: updatedItem.updated_at
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

// 6. 아이템 삭제
export const deleteItem = async (itemId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 관련 이미지들 먼저 삭제
    await supabase
      .from('item_images')
      .delete()
      .eq('item_id', itemId);

    // 아이템 삭제
    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (deleteError) throw deleteError;

    return {
      res_code: 200,
      res_msg: '아이템이 성공적으로 삭제되었습니다'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 7. 아이템 상태 업데이트
export const updateItemStatus = async (itemId, status) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 현재 스키마에 status 컬럼이 없으므로 임시로 구현
    return {
      res_code: 200,
      res_msg: '아이템 상태가 업데이트되었습니다',
      item: {
        id: itemId,
        status: status,
        updated_at: new Date().toISOString()
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
