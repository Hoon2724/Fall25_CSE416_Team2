import { supabase } from '../supabaseClient';

// 1. 위시리스트에 아이템 추가
export const addToWishlist = async (itemId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 중복 체크
    const { data: existingWishlist, error: checkError } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .single();

    if (existingWishlist) {
      return {
        res_code: 409,
        res_msg: '이미 위시리스트에 추가된 아이템입니다'
      };
    }

    // 위시리스트에 추가
    const { data: newWishlist, error: wishlistError } = await supabase
      .from('wishlists')
      .insert([
        {
          user_id: user.id,
          item_id: itemId
        }
      ])
      .select()
      .single();

    if (wishlistError) throw wishlistError;

    return {
      res_code: 201,
      res_msg: '위시리스트에 추가되었습니다',
      wishlist: newWishlist
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 2. 위시리스트에서 아이템 제거
export const removeFromWishlist = async (itemId) => {
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
      .from('wishlists')
      .delete()
      .eq('user_id', user.id)
      .eq('item_id', itemId);

    if (deleteError) throw deleteError;

    return {
      res_code: 200,
      res_msg: '위시리스트에서 제거되었습니다'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 3. 사용자 위시리스트 조회
export const getUserWishlist = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { data: wishlists, error: wishlistError } = await supabase
      .from('wishlists')
      .select(`
        id,
        created_at,
        items (
          id,
          title,
          price,
          item_images (
            url
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (wishlistError) throw wishlistError;

    const transformedWishlists = wishlists.map(wishlist => ({
      id: wishlist.id,
      item: {
        id: wishlist.items.id,
        title: wishlist.items.title,
        price: wishlist.items.price,
        images: wishlist.items.item_images ? wishlist.items.item_images.map(img => ({
          image_url: img.url
        })) : []
      },
      created_at: wishlist.created_at
    }));

    return {
      res_code: 200,
      res_msg: '위시리스트 조회 성공',
      wishlists: transformedWishlists
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 4. 위시리스트에 아이템이 있는지 확인
export const isItemInWishlist = async (itemId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    const { data: wishlist, error: wishlistError } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .single();

    return {
      res_code: 200,
      res_msg: '위시리스트 확인 완료',
      in_wishlist: !!wishlist
    };
  } catch (error) {
    return {
      res_code: 200,
      res_msg: '위시리스트 확인 완료',
      in_wishlist: false
    };
  }
};
