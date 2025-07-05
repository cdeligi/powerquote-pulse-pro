
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
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

  const fetchProfile = async (uid: string, timeoutMs: number = 3000): Promise<void> => {
    console.log('[useAuth] fetchProfile start for:', uid);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), timeoutMs);
    });
    
    try {
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('[useAuth] No profile found for user:', uid);
          // Create a default user profile if none exists
          const defaultUser: AppUser = {
            id: uid,
            name: 'User',
            email: session?.user?.email || 'unknown@example.com',
            role: 'level1',
            department: undefined
          };
          setUser(defaultUser);
        } else {
          console.error('[useAuth] Profile fetch error:', error);
          // Create fallback user even on error
          const fallbackUser: AppUser = {
            id: uid,
            name: 'User',
            email: session?.user?.email || 'unknown@example.com',
            role: 'level1',
            department: undefined
          };
          setUser(fallbackUser);
        }
        return;
      }

      if (data) {
        console.log('[useAuth] Profile loaded successfully:', data.email);
        const appUser: AppUser = {
          id: data.id,
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User',
          email: data.email,
          role: data.role as 'level1' | 'level2' | 'admin' | 'finance',
          department: data.department
        };
        setUser(appUser);
      } else {
        console.warn('[useAuth] Profile data is null for user:', uid);
        // Create fallback user
        const fallbackUser: AppUser = {
          id: uid,
          name: 'User',
          email: session?.user?.email || 'unknown@example.com',
          role: 'level1',
          department: undefined
        };
        setUser(fallbackUser);
      }
    } catch (err) {
      console.error('[useAuth] Profile fetch timeout or error:', err);
      // Always create a fallback user to prevent loading hang
      const fallbackUser: AppUser = {
        id: uid,
        name: 'User',
        email: session?.user?.email || 'unknown@example.com',
        role: 'level1',
        department: undefined
      };
      setUser(fallbackUser);
    }
  };

  const logSecurityEvent = async (action: string, details: any = {}) => {
    try {
      // Get user's IP and user agent
      const userAgent = navigator.userAgent;
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      
      await supabase.rpc('log_security_event', {
        p_user_id: session?.user?.id,
        p_action: action,
        p_details: details,
        p_ip_address: ipData.ip,
        p_user_agent: userAgent,
        p_severity: 'info'
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const trackUserSession = async () => {
    if (!session?.user?.id) return;
    
    try {
      const userAgent = navigator.userAgent;
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      
      // Get device info
      const deviceInfo = {
        userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      // Get location data (approximate from IP)
      const locationResponse = await fetch(`http://ip-api.com/json/${ipData.ip}`);
      const locationData = await locationResponse.json();

      await supabase.rpc('track_user_session', {
        p_user_id: session.user.id,
        p_session_token: session.access_token,
        p_ip_address: ipData.ip,
        p_user_agent: userAgent,
        p_device_info: deviceInfo,
        p_location_data: locationData
      });
    } catch (error) {
      console.error('Failed to track user session:', error);
    }
  };

  useEffect(() => {
    console.log('[useAuth] Initializing auth state...');
    
    // Force loading to false after maximum timeout
    const maxLoadingTimeout = setTimeout(() => {
      console.warn('[useAuth] Maximum loading timeout reached, forcing loading to false');
      setLoading(false);
    }, 8000);

    // Setup auth state listener first
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useAuth] Auth state change:', event, session?.user?.email || 'no user');
        
        clearTimeout(maxLoadingTimeout);
        setSession(session);
        
        if (session?.user) {
          console.log('[useAuth] User session found, fetching profile...');
          try {
            await fetchProfile(session.user.id, 3000);
            
            if (event === 'SIGNED_IN') {
              // Log successful login and update login info
              await supabase.rpc('update_user_login', {
                p_user_id: session.user.id,
                p_success: true
              });
              await logSecurityEvent('session_established');
              await trackUserSession();
            }
          } catch (error) {
            console.error('[useAuth] Error fetching profile in auth state change:', error);
            // Create fallback user
            const fallbackUser: AppUser = {
              id: session.user.id,
              name: 'User',
              email: session.user.email || 'unknown@example.com',
              role: 'level1',
              department: undefined
            };
            setUser(fallbackUser);
          } finally {
            setLoading(false);
          }
        } else {
          console.log('[useAuth] No user session, clearing user state');
          if (event === 'SIGNED_OUT') {
            await logSecurityEvent('session_terminated');
          }
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Get initial session with timeout
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
          await fetchProfile(session.user.id, 3000);
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
        // Log failed login attempt
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
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[useAuth] Supabase signOut error:', error);
      } else {
        console.log('[useAuth] Supabase signOut successful');
        // Clear auth state immediately
        setUser(null);
        setSession(null);
        try {
          localStorage.removeItem('supabase.auth.token');
        } catch (storageErr) {
          console.warn('[useAuth] Failed to clear local storage:', storageErr);
        }
      }

      return { error };
    } catch (err) {
      console.error('[useAuth] Sign out error:', err);
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
