import { supabase } from '../supabaseClient';

export const addToWishlist = async (itemId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { data: existingWishlist, error: checkError } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingWishlist) {
      return {
        res_code: 409,
        res_msg: 'Item is already in your wishlist'
      };
    }

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
      res_msg: 'Added to wishlist',
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

export const removeFromWishlist = async (itemId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
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
      res_msg: 'Removed from wishlist'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const getUserWishlist = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
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
      res_msg: 'Wishlist retrieved successfully',
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

export const isItemInWishlist = async (itemId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { data: wishlist, error: wishlistError } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .maybeSingle();

    if (wishlistError && wishlistError.code !== 'PGRST116') {
      throw wishlistError;
    }

    return {
      res_code: 200,
      res_msg: 'Wishlist check complete',
      in_wishlist: !!wishlist
    };
  } catch (error) {
    return {
      res_code: 200,
      res_msg: 'Wishlist check complete',
      in_wishlist: false
    };
  }
};


