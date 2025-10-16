import { supabase } from '../supabaseClient';

// 1. 카테고리 목록 조회
export const getCategories = async () => {
  try {
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (categoriesError) throw categoriesError;

    return {
      res_code: 200,
      res_msg: '카테고리 목록 조회 성공',
      categories: categories
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 2. 카테고리 생성 (관리자용)
export const createCategory = async (categoryData) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 관리자 권한 체크 (현재는 모든 인증된 사용자가 카테고리 생성 가능)
    // 실제로는 관리자 권한 테이블이나 역할 기반 접근 제어 필요

    const { name, description } = categoryData;

    const { data: newCategory, error: categoryError } = await supabase
      .from('categories')
      .insert([
        {
          name,
          description
        }
      ])
      .select()
      .single();

    if (categoryError) throw categoryError;

    return {
      res_code: 201,
      res_msg: '카테고리가 성공적으로 생성되었습니다',
      category: newCategory
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 3. 카테고리 수정 (관리자용)
export const updateCategory = async (categoryId, updates) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 관리자 권한 체크 필요

    const { data: updatedCategory, error: updateError } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: '카테고리가 성공적으로 수정되었습니다',
      category: updatedCategory
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 4. 카테고리 삭제 (관리자용)
export const deleteCategory = async (categoryId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 관리자 권한 체크 필요

    // 해당 카테고리를 사용하는 아이템이 있는지 확인
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1);

    if (itemsError) throw itemsError;

    if (items && items.length > 0) {
      return {
        res_code: 409,
        res_msg: '해당 카테고리를 사용하는 아이템이 있어 삭제할 수 없습니다'
      };
    }

    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) throw deleteError;

    return {
      res_code: 200,
      res_msg: '카테고리가 성공적으로 삭제되었습니다'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};
