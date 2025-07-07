/**
 *  2025 Qualitrol Corp. All rights reserved.
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
      const { data, error } = await supabase.client
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
    
    // Wait for Supabase client to be ready
    const initAuth = async () => {
      try {
        await supabase.init();
        
        // Set up auth state listener
        const { data: listener } = supabase.client.auth.onAuthStateChange(
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
        const { data: { session }, error } = await supabase.client.auth.getSession();
        
        if (error) {
          console.error('[useAuth] getSession error:', error);
          setLoading(false);
        } else {
          setSession(session);
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('[useAuth] Initialization error:', error);
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (data.session?.user) {
        await fetchProfile(data.session.user.id);
      }
      return { error: null };
    } catch (error) {
      console.error('[useAuth] Sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.client.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      return { error: null };
    } catch (error) {
      console.error('[useAuth] Sign out error:', error);
      return { error };
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
  };
}
