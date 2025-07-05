
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserSession } from '@/types/finance';

export const useUserSessions = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Failed to fetch user sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load user sessions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeUserAccess = async (userId: string, reason: string = 'Admin revoked access') => {
    try {
      const { data, error } = await supabase.rpc('revoke_user_access', {
        p_target_user_id: userId,
        p_reason: reason
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User access revoked successfully"
      });

      await fetchUserSessions();
    } catch (error: any) {
      console.error('Failed to revoke user access:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to revoke user access",
        variant: "destructive"
      });
    }
  };

  const trackSession = async (sessionData: {
    session_token: string;
    ip_address?: string;
    user_agent?: string;
    device_info?: Record<string, any>;
    location_data?: Record<string, any>;
  }) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase.rpc('track_user_session', {
        p_user_id: user.user.id,
        p_session_token: sessionData.session_token,
        p_ip_address: sessionData.ip_address,
        p_user_agent: sessionData.user_agent,
        p_device_info: sessionData.device_info || {},
        p_location_data: sessionData.location_data || {}
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to track session:', error);
    }
  };

  useEffect(() => {
    fetchUserSessions();
  }, []);

  return {
    sessions,
    loading,
    fetchUserSessions,
    revokeUserAccess,
    trackSession
  };
};
