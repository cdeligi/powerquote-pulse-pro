
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

  const fetchProfile = async (uid: string): Promise<void> => {
    console.log('[useAuth] fetchProfile start for:', uid);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) {
        console.error('[useAuth] Profile fetch error:', error);
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
      }
    } catch (err) {
      console.error('[useAuth] Profile fetch error:', err);
    }
  };

  useEffect(() => {
    console.log('[useAuth] Initializing auth state...');
    
    // Set up auth state listener
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useAuth] Auth state change:', event, session?.user?.email || 'no user');
        
        setSession(session);
        
        if (session?.user) {
          console.log('[useAuth] User session found, fetching profile...');
          await fetchProfile(session.user.id);
        } else {
          console.log('[useAuth] No user session, clearing user state');
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[useAuth] getSession error:', error);
          setLoading(false);
          return;
        }
        
        console.log('[useAuth] Initial session check:', session?.user?.email || 'no session');
        setSession(session);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('[useAuth] getSession error:', err);
        setLoading(false);
      }
    };

    getInitialSession();

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
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      // Clear any cached data
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[useAuth] Supabase signOut error:', error);
      } else {
        console.log('[useAuth] Supabase signOut successful');
      }
      
      // Force reload to ensure clean state
      window.location.href = '/';
      
      return { error };
    } catch (err) {
      console.error('[useAuth] Sign out error:', err);
      // Still clear local state even if there's an error
      setUser(null);
      setSession(null);
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
