import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QuoteShare {
  id: string;
  quote_id: string;
  shared_by: string;
  shared_with: string;
  shared_with_email?: string;
  shared_with_name?: string;
  permission_level: 'view' | 'edit';
  created_at: string;
  expires_at?: string;
}

export interface UserOption {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export const useQuoteSharing = () => {
  const [shares, setShares] = useState<QuoteShare[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .neq('id', (await supabase.auth.getUser()).data.user?.id)
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchQuoteShares = async (quoteId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quote_shares')
        .select(`
          *,
          profiles!inner (
            id,
            email,
            first_name,  
            last_name
          )
        `)
        .eq('quote_id', quoteId);

      if (error) throw error;
      
      // Transform the data to match the expected structure
      const formattedShares = (data || []).map(share => ({
        ...share,
        shared_with_email: share.profiles?.email,
        shared_with_name: `${share.profiles?.first_name || ''} ${share.profiles?.last_name || ''}`.trim()
      }));

      setShares(formattedShares);
    } catch (error) {
      console.error('Error fetching quote shares:', error);
      toast({
        title: "Error",
        description: "Failed to load quote shares",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const shareQuote = async (
    quoteId: string, 
    sharedWithUserId: string, 
    permissionLevel: 'view' | 'edit' = 'view',
    expiresIn?: number // days
  ) => {
    try {
      const expiresAt = expiresIn 
        ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('quote_shares')
        .insert({
          quote_id: quoteId,
          shared_with: sharedWithUserId,
          permission_level: permissionLevel,
          shared_by: (await supabase.auth.getUser()).data.user?.id,
          expires_at: expiresAt
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quote shared successfully"
      });

      // Refresh shares
      await fetchQuoteShares(quoteId);
    } catch (error: any) {
      console.error('Error sharing quote:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Already Shared",
          description: "This quote is already shared with that user",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to share quote",
          variant: "destructive"
        });
      }
    }
  };

  const unshareQuote = async (shareId: string, quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quote_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quote unshared successfully"
      });

      // Refresh shares
      await fetchQuoteShares(quoteId);
    } catch (error) {
      console.error('Error unsharing quote:', error);
      toast({
        title: "Error",
        description: "Failed to unshare quote",
        variant: "destructive"
      });
    }
  };

  const updateSharePermission = async (shareId: string, quoteId: string, newPermission: 'view' | 'edit') => {
    try {
      const { error } = await supabase
        .from('quote_shares')
        .update({ permission_level: newPermission })
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission updated successfully"
      });

      // Refresh shares
      await fetchQuoteShares(quoteId);
    } catch (error) {
      console.error('Error updating share permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    shares,
    users,
    loading,
    fetchQuoteShares,
    shareQuote,
    unshareQuote,
    updateSharePermission,
    fetchUsers
  };
};