import { useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

function AuthCallback() {
    const [message, setMessage] = useState('Signing you in...');

    useEffect(() => {
        const finalizeLogin = async () => {
            console.log('🔵 [AuthCallback] Starting...');
            console.log('🔵 [AuthCallback] Current URL:', window.location.href);
            
            try {
                // If Supabase returned an error in the URL, bail early
                const url = new URL(window.location.href);
                const urlError = url.searchParams.get('error') || url.searchParams.get('error_description');
                console.log('🔵 [AuthCallback] URL error params:', { error: url.searchParams.get('error'), error_description: url.searchParams.get('error_description') });
                
                if (urlError) {
                    console.error('❌ [AuthCallback] Error in URL:', urlError);
                    setMessage(`Authentication failed: ${urlError}. Redirecting to sign in...`);
                    setTimeout(() => window.location.replace('/signIn'), 3000);
                    return;
                }

                // Ensure a session exists; exchange authorization code if needed
                console.log('🔵 [AuthCallback] Checking session...');
                const { data: sessData, error: sessError } = await supabase.auth.getSession();
                console.log('🔵 [AuthCallback] Session check result:', { hasSession: !!sessData?.session, error: sessError });
                
                if (!sessData?.session) {
                    console.log('🔵 [AuthCallback] No session found, attempting code exchange...');
                    try {
                        const exchangeResult = await supabase.auth.exchangeCodeForSession({ currentUrl: window.location.href });
                        console.log('🔵 [AuthCallback] Code exchange result:', { success: !exchangeResult.error, error: exchangeResult.error });
                        
                        if (exchangeResult.error) {
                            console.error('❌ [AuthCallback] Code exchange failed:', exchangeResult.error);
                            setMessage(`Code exchange failed: ${exchangeResult.error.message}. Check console.`);
                            setTimeout(() => window.location.replace('/signIn'), 5000);
                            return;
                        }
                        
                        // Clean the URL to avoid re-exchange loops
                        window.history.replaceState({}, '', '/auth/callback');
                        
                        // Verify session was created after code exchange
                        const { data: newSessData, error: newSessError } = await supabase.auth.getSession();
                        if (newSessError || !newSessData?.session) {
                            console.error('❌ [AuthCallback] Session not available after code exchange');
                            setMessage('Session creation failed. Redirecting to sign in...');
                            setTimeout(() => window.location.replace('/signIn'), 3000);
                            return;
                        }
                        console.log('✅ [AuthCallback] Session verified after code exchange');
                    } catch (ex) {
                        console.error('❌ [AuthCallback] Code exchange exception:', ex);
                        setMessage(`Exchange exception: ${ex.message}. Check console.`);
                        setTimeout(() => window.location.replace('/signIn'), 5000);
                        return;
                    }
                }

                // Final session check before proceeding
                const { data: finalSessData, error: finalSessError } = await supabase.auth.getSession();
                if (finalSessError || !finalSessData?.session) {
                    console.error('❌ [AuthCallback] No valid session available');
                    setMessage('No valid session. Redirecting to sign in...');
                    setTimeout(() => window.location.replace('/signIn'), 3000);
                    return;
                }

                console.log('🔵 [AuthCallback] Getting current user...');
                const result = await getCurrentUser();
                console.log('🔵 [AuthCallback] getCurrentUser result:', result);
                
                if (result && result.res_code === 200) {
                    console.log('✅ [AuthCallback] User profile exists, redirecting to home');
                    setMessage('Sign-in complete! Redirecting to home...');
                    setTimeout(() => window.location.replace('/home'), 2000);
                    return;
                }

                // If authenticated but no profile exists, create a new profile record
                console.log('🔵 [AuthCallback] Profile not found, checking auth user...');
                const { data: authData, error: authError } = await supabase.auth.getUser();
                console.log('🔵 [AuthCallback] auth.getUser result:', { hasUser: !!authData?.user, error: authError });
                
                if (authError) {
                    console.error('❌ [AuthCallback] auth.getUser error:', authError);
                    throw authError;
                }

                const oauthUser = authData?.user;
                if (!oauthUser) {
                    console.error('❌ [AuthCallback] No OAuth user found');
                    setMessage('Not authenticated. Redirecting to sign in...');
                    setTimeout(() => window.location.replace('/signIn'), 3000);
                    return;
                }

                console.log('🔵 [AuthCallback] OAuth user found:', { id: oauthUser.id, email: oauthUser.email });

                // Check if profile exists
                console.log('🔵 [AuthCallback] Checking if profile exists in DB...');
                const { data: existing, error: profileFetchError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', oauthUser.id)
                    .single();

                console.log('🔵 [AuthCallback] Profile check result:', { exists: !!existing, error: profileFetchError });

                if (profileFetchError && profileFetchError.code !== 'PGRST116') {
                    console.error('❌ [AuthCallback] Profile fetch error (not PGRST116):', profileFetchError);
                    throw profileFetchError;
                }

                if (!existing) {
                    console.log('🔵 [AuthCallback] Creating new user profile...');
                    const displayName = oauthUser.user_metadata?.full_name || oauthUser.user_metadata?.name || oauthUser.email?.split('@')[0] || 'User';
                    const { error: insertError } = await supabase
                        .from('users')
                        .insert([
                            {
                                id: oauthUser.id,
                                email: oauthUser.email,
                                display_name: displayName,
                                school_verified: false,
                                trust_score: 0.0,
                                total_reviews: 0
                            }
                        ]);
                    
                    if (insertError) {
                        console.error('❌ [AuthCallback] Profile insert error:', insertError);
                        throw insertError;
                    }
                    console.log('✅ [AuthCallback] Profile created successfully');
                    
                    // Verify profile was created by calling getCurrentUser again
                    const verifyResult = await getCurrentUser();
                    if (verifyResult && verifyResult.res_code === 200) {
                        console.log('✅ [AuthCallback] Profile verified, redirecting to home');
                        setMessage('Account created! Redirecting to home...');
                        setTimeout(() => window.location.replace('/home'), 2000);
                        return;
                    } else {
                        console.warn('⚠️ [AuthCallback] Profile created but verification failed, redirecting anyway');
                    }
                }

                console.log('✅ [AuthCallback] Success! Redirecting to home...');
                setMessage('Sign-in complete! Redirecting to home...');
                setTimeout(() => window.location.replace('/home'), 2000);
            } catch (e) {
                console.error('❌ [AuthCallback] Exception caught:', e);
                setMessage(`Error: ${e.message}. Check console for details.`);
                setTimeout(() => window.location.replace('/signIn'), 5000);
            }
        };
        finalizeLogin();
    }, []);

    return (
        <div style={{ padding: 24 }}>
            <p>{message}</p>
        </div>
    );
}

export default AuthCallback;

