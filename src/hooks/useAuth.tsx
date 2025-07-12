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

  const fetchProfile = async (uid: string, timeoutMs: number = 2000): Promise<AppUser | null> => {
    console.log('[useAuth] fetchProfile start for:', uid);
    
    // Special handling for admin user - Updated to match database
    if (uid === '7f6234f4-a195-4fae-a4e0-fa30c4026c6f') {
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
    // Disabled to prevent credit consumption - only log locally
    console.log('[useAuth] Security event (disabled):', { action, details });
  };

  const trackUserSession = async () => {
    // Disabled to prevent credit consumption - only log locally
    console.log('[useAuth] User session tracking disabled');
  };

  useEffect(() => {
    console.log('[useAuth] Initializing auth state...');
    
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuth] Auth state changed:', event);
      setSession(session);
      if (session) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        const profile = await fetchProfile(data.session.user.id);
        setUser(profile);
        setSession(data.session);
      }

      return { error: null };
    } catch (error) {
      console.error('[useAuth] Sign in error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      return { error: null };
    } catch (error) {
      console.error('[useAuth] Sign out error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // No automatic redirects - let the Index component handle authentication state

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
  };
}
