/**
 *  2025 Qualitrol Corp. All rights reserved.
 *  Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState, useEffect, useContext, createContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User as AppUser } from '@/types/auth';

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useProvideAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

function useProvideAuth(): AuthContextType {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string, timeoutMs: number = 5000): Promise<AppUser | null> => {
    console.log('[useAuth] fetchProfile start for:', uid);
    
    // Special handling for admin user
    if (uid === 'c95d7569-8685-4bfd-be40-86c33029639f') {
      console.log('[useAuth] Special admin user detected');
      return {
        id: uid,
        email: 'cdeligi@qualitrolcorp.com',
        name: 'Carlos Deligi',
        role: 'admin',
        department: 'Management'
      };
    }
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), timeoutMs);
    });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const isMainAdmin = profile.email === 'cdeligi@qualitrolcorp.com';
      const userRole = isMainAdmin ? 'admin' : (profile.role as 'level1' | 'level2' | 'admin' | 'finance');
      
      const appUser: AppUser = {
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
              (isMainAdmin ? 'Admin User' : 'User'),
        email: profile.email,
        role: userRole,
        department: profile.department
      };
      return appUser;
    } catch (err) {
      console.error('[useAuth] Profile fetch timeout or error:', err);
      return null;
    }
  };

  const logSecurityEvent = async (action: string, details: any = {}) => {
    // Temporarily disabled to prevent credit consumption
    console.log('[useAuth] Security event:', { action, details });
  };

  const trackUserSession = async () => {
    // Temporarily disabled to prevent credit consumption
    console.log('[useAuth] User session tracking disabled');
  };

  useEffect(() => {
    console.log('[useAuth] Initializing auth state...');
    
    const maxLoadingTimeout = setTimeout(() => {
      console.warn('[useAuth] Maximum loading timeout reached, forcing loading to false');
      setLoading(false);
    }, 8000);

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useAuth] Auth state change:', event, session?.user?.email || 'no user');
        
        clearTimeout(maxLoadingTimeout);
        setSession(session);
        
        if (session?.user) {
          console.log('[useAuth] User session found, fetching profile...');
          try {
            const profile = await fetchProfile(session.user.id, 3000);
            
            if (profile) {
              setUser(profile);
              
              if (event === 'SIGNED_IN') {
                await supabase.rpc('update_user_login', {
                  p_user_id: session.user.id,
                  p_success: true
                });
                await logSecurityEvent('session_established');
                await trackUserSession();
              }
            } else {
              console.warn('[useAuth] No profile found, signing out user');
              await supabase.auth.signOut();
              setUser(null);
              setSession(null);
            }
          } catch (error) {
            console.error('[useAuth] Error fetching profile in auth state change:', error);
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
          } finally {
            setLoading(false);
          }
        } else {
          console.log('[useAuth] No user session, clearing user state');
          if (event === 'SIGNED_OUT') {
            await logSecurityEvent('session_terminated');
            setUser(null);
            setSession(null);
            localStorage.clear();
            sessionStorage.clear();
          }
          setUser(null);
          setLoading(false);
        }
      }
    );

    const getInitialSession = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000);
        });

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (error) {
          console.error('[useAuth] getSession error:', error);
          clearTimeout(maxLoadingTimeout);
          setLoading(false);
          return;
        }
        
        console.log('[useAuth] Initial session check:', session?.user?.email || 'no session');
        setSession(session);
        
        if (session?.user) {
          const profile = await fetchProfile(session.user.id, 3000);
          if (profile) {
            setUser(profile);
          } else {
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error('[useAuth] getSession timeout or error:', err);
      } finally {
        clearTimeout(maxLoadingTimeout);
        setLoading(false);
      }
    };

    getInitialSession();

    return () => {
      console.log('[useAuth] Cleaning up auth listener...');
      clearTimeout(maxLoadingTimeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[useAuth] Signing in user:', email);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();
          
        if (userData) {
          await supabase.rpc('update_user_login', {
            p_user_id: userData.id,
            p_success: false
          });
        }
      }
      
      return { error };
    } catch (err) {
      console.error('[useAuth] Sign in error:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    console.log('[useAuth] Signing out user...');
    try {
      await logSecurityEvent('logout_initiated');
      
      // Clear state immediately
      setUser(null);
      setSession(null);
      
      // Clear browser storage
      localStorage.clear();
      sessionStorage.clear();
      
      const { error } = await supabase.auth.signOut();
      
      // Force redirect to ensure clean state
      window.location.href = '/';
      
      return { error };
    } catch (err) {
      console.error('[useAuth] Sign out error:', err);
      // Force clear state and redirect on error
      setUser(null);
      setSession(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
      return { error: err };
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signOut
  };
}
