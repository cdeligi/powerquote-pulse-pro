
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: any;
  location_data: any;
  is_active: boolean;
  created_at: string;
  last_activity: string;
  revoked_at: string | null;
  revoked_reason: string | null;
}

export const useUserSessions = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user sessions:', error);
        toast({
          title: "Error",
          description: "Failed to load user sessions",
          variant: "destructive"
        });
        return;
      }

      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load user sessions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeUserAccess = async (userId: string, reason: string) => {
    try {
      const { data, error } = await supabase.rpc('revoke_user_access', {
        p_target_user_id: userId,
        p_reason: reason
      });

      if (error) {
        console.error('Error revoking user access:', error);
        toast({
          title: "Error",
          description: "Failed to revoke user access",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "User access has been revoked successfully",
      });

      // Refresh sessions
      await fetchSessions();
    } catch (error) {
      console.error('Error revoking user access:', error);
      toast({
        title: "Error",
        description: "Failed to revoke user access",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return {
    sessions,
    loading,
    revokeUserAccess,
    refetch: fetchSessions
  };
};
