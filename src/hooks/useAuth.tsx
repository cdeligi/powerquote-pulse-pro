import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();
import { User, AuthError, Role } from "@/types/auth";

// Helper function to map database role to app role
const mapDatabaseRoleToAppRole = (dbRole: string): Role => {
  switch (dbRole) {
    case "level1":
    case "LEVEL_1":
      return "LEVEL_1";
    case "level2":
    case "LEVEL_2":
      return "LEVEL_2";
    case "admin":
    case "ADMIN":
      return "ADMIN";
    case "LEVEL_3":
      return "LEVEL_3";
    case "FINANCE":
      return "FINANCE";
    default:
      return "LEVEL_1";
  }
};

interface AuthContextType {
  user: User | null;
  session: any | null;
  loading: boolean;
  error: AuthError | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  const handleAuthStateChange = useCallback((event: string, session: any) => {
    console.log("[AuthProvider] Auth state change:", { event, hasSession: !!session, userId: session?.user?.id });
    
    if (event === 'SIGNED_IN' && session?.user) {
      setLoading(true);
      setError(null);
      setSession(session);
      
      // CRITICAL FIX: Defer fetchProfile to avoid deadlock
      setTimeout(async () => {
        try {
          const profile = await fetchProfile(session.user.id);
          if (profile) {
            console.log("[AuthProvider] Successfully authenticated user:", profile.email);
            // Log session events
            logUserSession(session.user.id, 'login').catch(console.error);
          } else {
            console.error("[AuthProvider] Failed to load user profile");
            setError({
              code: 'PROFILE_LOAD_FAILED',
              message: 'Failed to load user profile. Please try again.',
              type: 'profile'
            });
          }
        } catch (error) {
          console.error("[AuthProvider] Error in auth state change:", error);
          setError({
            code: 'PROFILE_ERROR', 
            message: 'Error loading user data. Please try again.',
            type: 'profile'
          });
        } finally {
          setLoading(false);
        }
      }, 0);
    } else if (event === 'SIGNED_OUT') {
      setUser(null);
      setSession(null);
      setError(null);
      setLoading(false);
    } else if (event === 'TOKEN_REFRESHED' && session) {
      setSession(session);
    } else if (event === 'INITIAL_SESSION' && session?.user) {
      setSession(session);
      // Defer fetchProfile to avoid deadlock
      setTimeout(async () => {
        await fetchProfile(session.user.id);
        setLoading(false);
      }, 0);
    } else {
      setLoading(false);
    }
  }, []);
  
  // Initialize auth state with session refresh and tab focus validation
  useEffect(() => {
    console.log("[AuthProvider] Initializing auth state...");
    let isMounted = true;
    let subscription: any;
    let refreshInterval: NodeJS.Timeout | null = null;
    
    const initializeAuth = async () => {
      try {
        // Set up auth state listener first
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
        subscription = authSubscription;
        
        // Check for existing session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[AuthProvider] Session error:", error);
          if (isMounted) {
            setError({
              code: error.message || 'SESSION_ERROR',
              message: 'Authentication session error. Please sign in again.',
              type: 'session'
            });
            setLoading(false);
          }
          return;
        }
        
        if (!isMounted) return;
        
        if (initialSession?.user) {
          console.log("[AuthProvider] Initial session found for:", initialSession.user.email);
          handleAuthStateChange('INITIAL_SESSION', initialSession);
          
          // Set up periodic session refresh every 30 minutes
          refreshInterval = setInterval(async () => {
            console.log("[AuthProvider] Periodic session refresh");
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.error("[AuthProvider] Periodic refresh failed:", refreshError);
            }
          }, 30 * 60 * 1000); // 30 minutes
        } else {
          console.log("[AuthProvider] No existing session found");
          setLoading(false);
        }
      } catch (error) {
        console.error("[AuthProvider] Error during auth initialization:", error);
        if (isMounted) {
          setError({
            code: 'INIT_ERROR',
            message: 'Failed to initialize authentication. Please refresh the page.',
            type: 'session'
          });
          setLoading(false);
        }
      }
    };
    
    // Validate session on tab focus to prevent stale sessions
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log("[AuthProvider] Tab focused, validating session");
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Refresh session if it exists
          await supabase.auth.refreshSession();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    initializeAuth();
    
    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleAuthStateChange]);

  const signIn = async (email: string, password: string) => {
    console.log(`[AuthProvider] Sign in attempt for: ${email}`);
    setLoading(true);
    setError(null);

    try {
      const {
        error: authError,
        data: { session },
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error("[AuthProvider] Sign in error:", {
          errorCode: authError.code,
          errorMessage: authError.message,
        });
        setError({
          code: authError.code || "AUTH_ERROR",
          message: authError.message,
          type: "auth",
        });
        setLoading(false);
        return { error: authError };
      }

      console.log("[AuthProvider] Sign in request successful, awaiting auth state change...");
      // Loading will be handled by handleAuthStateChange
      return { error: null };
    } catch (err) {
      console.error("[AuthProvider] Unexpected sign in error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError({
        code: "AUTH_ERROR",
        message: errorMessage,
        type: "auth",
      });
      setLoading(false);
      return { error: { message: errorMessage } };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: authError } = await supabase.auth.signOut();

      if (authError) {
        console.error("[AuthProvider] Sign out error:", authError);
        setError({
          code: authError.code || "AUTH_ERROR",
          message: authError.message,
          type: "auth",
        });
        return;
      }

      setUser(null);
      setSession(null);
    } catch (err) {
      console.error("[AuthProvider] Sign out unexpected error:", err);
      setError({
        code: "AUTH_ERROR",
        message: "An unexpected error occurred during sign out",
        type: "auth",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: authError } = await supabase.auth.refreshSession();

      if (authError) {
        console.error("[AuthProvider] Session refresh error:", authError);
        setError({
          code: authError.code || "SESSION_ERROR",
          message: authError.message,
          type: "session",
        });
        return;
      }
    } catch (err) {
      console.error("[AuthProvider] Session refresh unexpected error:", err);
      setError({
        code: "SESSION_ERROR",
        message: "An unexpected error occurred during session refresh",
        type: "session",
      });
    } finally {
      setLoading(false);
    }
  };

  const logUserSession = async (
    userId: string,
    event: "login" | "logout" | "session_refresh",
  ) => {
    try {
      const { error } = await supabase.from("user_sessions").insert({
        user_id: userId,
        event,
        session_token: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ip_address: "unknown",
        user_agent: navigator.userAgent,
        device_info: {
          platform: navigator.platform,
          language: navigator.language,
          screen_resolution: `${screen.width}x${screen.height}`,
        },
        location: {},
      });

      if (error) {
        console.error("Error logging user session:", error);
        setError({
          code: (error as any)?.code || "SESSION_LOG_ERROR",
          message: (error as any)?.message || "Failed to log user session",
          type: "session",
        });
      }
    } catch (err) {
      console.error("Error logging user session:", err);
      setError({
        code: "SESSION_LOG_ERROR",
        message: "Failed to log user session",
        type: "session",
      });
    }
  };

  // Helper to fetch profile with simplified error handling
  const fetchProfile = async (uid: string): Promise<User | null> => {
    console.log("[AuthProvider] Fetching profile for:", uid);

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("[AuthProvider] Profile fetch error:", error);
        throw error;
      }

      let profileData = profile;

      if (!profileData) {
        console.log("[AuthProvider] No profile found, creating new profile for:", uid);
        
        const { data: sessionData } = await supabase.auth.getSession();
        const userEmail = sessionData.session?.user?.email;
        
        if (!userEmail) {
          throw new Error("No user email available for profile creation");
        }

        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: uid,
            email: userEmail,
            first_name: "",
            last_name: "",
            role: "level1",
            department: null,
          })
          .select()
          .single();

        if (createError) {
          console.error("[AuthProvider] Error creating profile:", createError);
          throw createError;
        }
        
        profileData = createdProfile;
      }

      if (!profileData) {
        throw new Error("Failed to load user profile");
      }

      console.log("[AuthProvider] Profile loaded successfully:", profileData.email);
      const appUser: User = {
        id: profileData.id,
        name: `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || profileData.email,
        email: profileData.email,
        role: mapDatabaseRoleToAppRole(profileData.role),
        department: profileData.department,
      };

      setUser(appUser);
      return appUser;
    } catch (err) {
      console.error("[AuthProvider] Profile fetch failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError({
        code: "PROFILE_FETCH_ERROR",
        message: errorMessage,
        type: "profile",
      });
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};