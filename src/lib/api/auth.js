import { supabase } from '../supabaseClient';

export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) throw error;

    return {
      res_code: 200,
      res_msg: 'Google login redirect',
      data: data
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    return {
      res_code: 200,
      res_msg: 'Logout successful'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;

    if (user) {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      return {
        res_code: 200,
        res_msg: 'User information retrieved successfully',
        user: userProfile
      };
    } else {
      return {
        res_code: 401,
        res_msg: 'User not logged in'
      };
    }
  } catch (error) {
    return {
      res_code: 401,
      res_msg: error.message,
      error: error
    };
  }
};
