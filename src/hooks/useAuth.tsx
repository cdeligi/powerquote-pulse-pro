
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

  // flag to avoid double-fetch
  let profileFetched = false;

  // fetch profile helper
  const fetchProfile = async (uid: string) => {
    if (profileFetched) {
      console.debug('[useAuth] fetchProfile skipped (already fetched)');
      return;
    }
    profileFetched = true;
    console.debug('[useAuth] fetchProfile start for', uid);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error && error.code !== 'PGRST116') { 
        // 116 means no rows—handle below
        console.error('[useAuth] error fetching profile:', error);
        setUser(null);
      } else if (data) {
        console.debug('[useAuth] profile data:', data);
        const appUser: AppUser = {
          id: data.id,
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User',
          email: data.email,
          role: data.role as 'level1' | 'level2' | 'admin',
          department: data.department
        };
        setUser(appUser);
      } else {
        console.warn('[useAuth] no profile found for', uid);
        setUser(null);
      }
    } catch (err) {
      console.error('[useAuth] unexpected fetch error:', err);
      setUser(null);
    } finally {
      console.debug('[useAuth] fetchProfile complete');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[useAuth] Setting up auth state...');
    
    // Reset the flag on each effect run
    profileFetched = false;

    // 1) Session check  
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('[useAuth] getSession error:', error);
          setLoading(false);
          return;
        }
        
        console.debug('[useAuth] getSession result:', session?.user?.email);
        setSession(session);
        if (session?.user) {
          // defer to avoid async in listener
          setTimeout(() => fetchProfile(session.user!.id), 0);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[useAuth] getSession error:', err);
        setLoading(false);
      });

    // 2) Auth state listener
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.debug('[useAuth] onAuthStateChange:', event, session?.user?.email);
        setSession(session);
        if (session?.user) {
          // Reset flag and defer profile fetch to next tick
          profileFetched = false;
          setTimeout(() => fetchProfile(session.user!.id), 0);
        } else {
          // signed out
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('[useAuth] Cleaning up auth listener...');
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
