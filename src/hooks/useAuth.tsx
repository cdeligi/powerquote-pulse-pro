
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User as AppUser } from '@/types/auth';

export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        
        if (session?.user) {
          // Fetch user profile from profiles table
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (error) {
              console.error('Error fetching profile:', error);
              setUser(null);
            } else if (profile) {
              const appUser: AppUser = {
                id: profile.id,
                name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User',
                email: profile.email,
                role: profile.role as 'level1' | 'level2' | 'admin',
                department: profile.department
              };
              setUser(appUser);
            }
          } catch (error) {
            console.error('Error in profile fetch:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // The onAuthStateChange will handle user profile fetching
        setSession(session);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signOut
  };
};
