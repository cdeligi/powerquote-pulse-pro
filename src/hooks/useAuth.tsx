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

  const fetchProfile = async (uid: string, email: string): Promise<void> => {
    console.log('[useAuth] fetchProfile start for:', uid);
    
    try {
      // First check if user exists in auth
      const { data: authUser, error: authError } = await supabase
        .from('auth.users')
        .select('*')
        .eq('id', uid)
        .single();

      if (authError) {
        console.error('[useAuth] Auth user fetch error:', authError);
        setUser(null);
        return;
      }

      // Get user metadata
      const userMetadata = authUser?.raw_user_meta_data || {};
      
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (profileError && !profileError.code.includes('PGRST107')) { // PGRST107 means no rows found
        console.error('[useAuth] Profile fetch error:', profileError);
        setUser(null);
        return;
      }

      // If profile doesn't exist, create one
      if (!profile) {
        console.log('[useAuth] Creating new profile for user:', uid);
        
        // For admin user, we need to bypass the policy check
        const isAdmin = email === 'cdeligi@qualitrolcorp.com';
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: uid,
            email: email,
            first_name: userMetadata.first_name || (isAdmin ? 'Carlos' : 'User'),
            last_name: userMetadata.last_name || (isAdmin ? 'Deligi' : 'User'),
            role: isAdmin ? 'admin' : 'level1',
            department: isAdmin ? 'Admin' : '',
            user_status: 'active'
          })
          .select()  // This will return the created profile
          .single();

        if (createError) {
          console.error('[useAuth] Error creating profile:', createError);
          setUser(null);
          return;
        }
      }

      // Get the profile data (either existing or newly created)
      const { data: finalProfile, error: finalError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (finalError) {
        console.error('[useAuth] Final profile fetch error:', finalError);
        setUser(null);
        return;
      }

      // Set up user object
      const appUser: AppUser = {
        id: uid,
        name: `${finalProfile?.first_name || ''} ${finalProfile?.last_name || ''}`.trim() || 'User',
        email: email,
        role: finalProfile?.role || 'level1',
        department: finalProfile?.department || ''
      };

      setUser(appUser);
    } catch (err) {
      console.error('[useAuth] Unexpected error in fetchProfile:', err);
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
            await fetchProfile(session.user.id, session.user.email);
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
          fetchProfile(session.user.id, session.user.email)
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

      if (error) {
        console.error('[useAuth] Sign in error:', error);
        return { error };
      }

      // Skip security logging in development mode
      if (import.meta.env.MODE === 'development') {
        console.log('[useAuth] Skipping security logging in development mode');
        return { error: null };
      }

      // Log security event - wrap in try/catch to prevent blocking
      try {
        await supabase
          .from('security_events')
          .insert({
            user_id: email,
            action: 'login',
            details: 'User successfully logged in',
            ip_address: window.location.hostname,
            user_agent: navigator.userAgent,
            severity: 'low',
            created_at: new Date().toISOString()
          });
        console.log('[useAuth] Security event logged successfully');
      } catch (logError) {
        console.warn('[useAuth] Security event logging failed:', logError);
        // Don't block sign-in if logging fails
      }

      return { error: null };
    } catch (err) {
      console.error('[useAuth] Sign in unexpected error:', err);
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
