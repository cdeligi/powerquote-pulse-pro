
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

  // Function to log user sessions
  const logUserSession = async (userId: string, event: 'login' | 'logout' | 'session_refresh') => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          event,
          ip_address: 'unknown', // Could be enhanced with IP detection
          user_agent: navigator.userAgent,
          device_info: {
            platform: navigator.platform,
            language: navigator.language,
            screen_resolution: `${screen.width}x${screen.height}`
          },
          location: {} // Could be enhanced with geolocation
        });

      if (error) {
        console.error('Error logging user session:', error);
      }
    } catch (error) {
      console.error('Error logging user session:', error);
    }
  };

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
          role: data.role as 'level1' | 'level2' | 'admin',
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
            
            // Log session events
            if (event === 'SIGNED_IN') {
              await logUserSession(session.user.id, 'login');
            } else if (event === 'TOKEN_REFRESHED') {
              await logUserSession(session.user.id, 'session_refresh');
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
          if (event === 'SIGNED_OUT' && user) {
            await logUserSession(user.id, 'logout');
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
      return { error };
    } catch (err) {
      console.error('[useAuth] Sign in error:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    console.log('[useAuth] Signing out user...');
    try {
      const { error } = await supabase.auth.signOut();
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
