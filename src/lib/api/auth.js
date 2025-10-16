import { supabase } from '../supabaseClient';

// 1. 사용자 등록
export const signUp = async (email, password, displayName) => {
  try {
    // 1단계: Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });

    if (authError) throw authError;

    // 2단계: public.users 테이블에 프로필 정보 저장
    if (authData.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            display_name: displayName,
            school_verified: false,
            trust_score: 0.0,
            total_reviews: 0
          }
        ])
        .select()
        .single();

      if (profileError) throw profileError;

      return {
        res_code: 200,
        res_msg: '회원가입이 완료되었습니다',
        user: profileData,
        session: authData.session
      };
    }
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 2. 사용자 로그인
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // 사용자 프로필 정보 가져오기
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return {
      res_code: 200,
      res_msg: '로그인 성공',
      user: userProfile,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }
    };
  } catch (error) {
    return {
      res_code: 401,
      res_msg: error.message,
      error: error
    };
  }
};

// 3. Google 로그인
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
      res_msg: 'Google 로그인 리다이렉트',
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

// 4. 이메일 도메인 검증
export const validateEmailDomain = async (email) => {
  const allowedDomains = ['sunykorea.ac.kr', 'stonybrook.edu'];
  const domain = email.split('@')[1];

  const isValid = allowedDomains.includes(domain);

  return {
    res_code: 200,
    res_msg: isValid ? '유효한 대학교 이메일입니다' : '허용되지 않는 이메일 도메인입니다',
    valid: isValid,
    domain: domain,
    message: isValid ? 'Valid university email domain' : 'Invalid email domain'
  };
};

// 5. 로그아웃
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    return {
      res_code: 200,
      res_msg: '로그아웃 성공'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 6. 현재 사용자 정보 가져오기
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
        res_msg: '사용자 정보 조회 성공',
        user: userProfile
      };
    } else {
      return {
        res_code: 401,
        res_msg: '로그인되지 않은 사용자입니다'
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
