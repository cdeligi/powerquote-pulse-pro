
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

  const fetchProfile = async (uid: string): Promise<void> => {
    console.log('[useAuth] fetchProfile start for:', uid);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('[useAuth] No profile found for user:', uid);
          setUser(null);
        } else {
          console.error('[useAuth] Profile fetch error:', error);
          setUser(null);
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
        setUser(null);
      }
    } catch (err) {
      console.error('[useAuth] Unexpected profile fetch error:', err);
      setUser(null);
    }
  };

  useEffect(() => {
    console.log('[useAuth] Initializing auth state...');
    
    // Set loading timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('[useAuth] Loading timeout reached, forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    // Setup auth state listener first
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useAuth] Auth state change:', event, session?.user?.email || 'no user');
        
        clearTimeout(loadingTimeout);
        setSession(session);
        
        if (session?.user) {
          console.log('[useAuth] User session found, fetching profile...');
          try {
            await fetchProfile(session.user.id);
          } catch (error) {
            console.error('[useAuth] Error fetching profile in auth state change:', error);
            setUser(null);
          } finally {
            setLoading(false);
          }
        } else {
          console.log('[useAuth] No user session, clearing user state');
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('[useAuth] getSession error:', error);
          clearTimeout(loadingTimeout);
          setLoading(false);
          return;
        }
        
        console.log('[useAuth] Initial session check:', session?.user?.email || 'no session');
        setSession(session);
        
        if (session?.user) {
          fetchProfile(session.user.id)
            .finally(() => {
              clearTimeout(loadingTimeout);
              setLoading(false);
            });
        } else {
          clearTimeout(loadingTimeout);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[useAuth] getSession unexpected error:', err);
        clearTimeout(loadingTimeout);
        setLoading(false);
      });

    return () => {
      console.log('[useAuth] Cleaning up auth listener...');
      clearTimeout(loadingTimeout);
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
