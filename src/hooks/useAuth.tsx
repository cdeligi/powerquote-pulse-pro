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

  const handleAuthStateChange = useCallback(async (event: string, session: any) => {
    console.log("[AuthProvider] Auth state change:", { event, hasSession: !!session });
    
    setSession(session);
    
    if (session?.user) {
      try {
        // Only fetch profile if we don't have user data or if user changed
        if (!user || user.id !== session.user.id) {
          await fetchProfile(session.user.id, 2000);
          // fetchProfile will update the user state internally
        }
        
        // Log session events
        if (event === 'SIGNED_IN') {
          logUserSession(session.user.id, 'login').catch(console.error);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      } catch (error) {
        console.error("[AuthProvider] Error in auth state change:", error);
      }
    } else {
      setUser(null);
    }
    
    setLoading(false);
  }, [user?.id]);
  
  // Initialize auth state
  useEffect(() => {
    console.log("[AuthProvider] Initializing auth state...");
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Set up auth state listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
        
        // Check for existing session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (initialSession?.user) {
          console.log("[AuthProvider] Initial session found, loading profile...");
          await handleAuthStateChange('INITIAL_SESSION', initialSession);
        } else {
          setLoading(false);
        }
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("[AuthProvider] Error during auth initialization:", error);
        if (isMounted) setLoading(false);
      }
    };
    
    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, [handleAuthStateChange]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log("[AuthProvider] Attempting sign in with:", {
        email: email,
        timestamp: new Date().toISOString(),
      });

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
        return { error: authError };
      }

      console.log("[AuthProvider] Sign in successful:", {
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      });

      // Wait for auth state change to update session and user
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return { error: null };
    } catch (err) {
      console.error("[AuthProvider] Sign in unexpected error:", err);
      setError({
        code: "AUTH_ERROR",
        message: "An unexpected error occurred during sign in",
        type: "auth",
      });
      return { error: err };
    } finally {
      setLoading(false);
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

  // Helper to fetch profile, with optional timeout, retry logic, and no 406 (uses maybeSingle)
  const fetchProfile = async (uid: string, timeoutMs = 15000): Promise<User | null> => {
    console.log("[AuthProvider] fetchProfile start for:", uid);

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const profilePromise = supabase
          .from("profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle();

        const { data: profile, error } = (await Promise.race([
          profilePromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Profile fetch timeout (attempt ${attempt})`)), timeoutMs),
          ),
        ])) as Awaited<typeof profilePromise>;

        if (error) throw error;

        let profileData = profile;

      if (!profileData) {
        console.log(
          "[AuthProvider] No profile found, creating new profile for user:",
          uid,
        );
        const { error: createError } = await supabase.from("profiles").insert({
          id: uid,
          email: session?.user?.email,
          first_name: "",
          last_name: "",
          company: "",
          phone: "",
          role: "level1",
          department: null,
        });

        if (createError) {
          console.error("[AuthProvider] Error creating profile:", createError);
          setError({
            code: (createError as any)?.code || "PROFILE_CREATE_ERROR",
            message: (createError as any)?.message || "Failed to create user profile",
            type: "profile",
          });
          throw createError;
        }

        const { data: createdProfile, error: fetchErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle();

        if (fetchErr) throw fetchErr;
        profileData = createdProfile || null;
      }

      if (!profileData) {
        throw new Error("Failed to fetch user profile");
      }

      console.log("[AuthProvider] Profile loaded successfully:", profileData.email);
      const appUser: User = {
        id: profileData.id,
        name:
          `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || "User",
        email: profileData.email,
        role: mapDatabaseRoleToAppRole(profileData.role),
        department: profileData.department,
      };
        setUser(appUser);
        return appUser;
      } catch (err) {
        console.error("[AuthProvider] Profile fetch error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError({
          code: "PROFILE_FETCH_ERROR",
          message: errorMessage,
          type: "profile",
        });
        setUser(null);
        
        // Wait before retrying
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        return null;
      }
    }
    
    return null;
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