import { useEffect, useState } from 'react';
import { getSupabaseClient, getSupabaseAdminClient, isAdminAvailable } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdminClient();;
import { useAuth } from '@/hooks/useAuth';
import { Role, UserFeatureOverride } from '@/types/auth';

interface PermissionData {
  features: Record<string, boolean>;
  loading: boolean;
  error: string | null;
}

export function usePermissions(): PermissionData & { has: (featureKey: string) => boolean } {
  const { user } = useAuth();
  const [permissionData, setPermissionData] = useState<PermissionData>({
    features: {},
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!user) {
      setPermissionData({ features: {}, loading: false, error: null });
      return;
    }

    const fetchPermissions = async () => {
      try {
        setPermissionData(prev => ({ ...prev, loading: true, error: null }));

        // Fetch role defaults
        const { data: roleDefaults, error: roleError } = await supabase
          .from('role_feature_defaults')
          .select('feature_key, allowed')
          .eq('role', user.role);

        if (roleError) throw roleError;

        // Fetch user overrides
        const { data: userOverrides, error: overrideError } = await supabase
          .from('user_feature_overrides')
          .select('feature_key, allowed')
          .eq('user_id', user.id);

        if (overrideError) throw overrideError;

        // Build effective permissions map
        const effectivePermissions: Record<string, boolean> = {};

        // Start with role defaults
        roleDefaults?.forEach(({ feature_key, allowed }) => {
          effectivePermissions[feature_key] = allowed;
        });

        // Apply user overrides (null means no override, use default)
        userOverrides?.forEach(({ feature_key, allowed }) => {
          if (allowed !== null) {
            effectivePermissions[feature_key] = allowed;
          }
        });

        setPermissionData({
          features: effectivePermissions,
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissionData({
          features: {},
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    fetchPermissions();
  }, [user]);

  const has = (featureKey: string): boolean => {
    return permissionData.features[featureKey] || false;
  };

  return {
    ...permissionData,
    has
  };
}

// Feature constants
export const FEATURES = {
  BOM_SHOW_PRODUCT_COST: 'FEATURE_BOM_SHOW_PRODUCT_COST',
  BOM_SHOW_MARGIN: 'FEATURE_BOM_SHOW_MARGIN',
  BOM_FORCE_PART_NUMBER: 'FEATURE_BOM_FORCE_PART_NUMBER',
  BOM_EDIT_PART_NUMBER: 'FEATURE_BOM_EDIT_PART_NUMBER',
  BOM_EDIT_PRICE: 'FEATURE_BOM_EDIT_PRICE'
} as const;

// Role labels for UI display
export const ROLE_LABELS: Record<Role, string> = {
  LEVEL_1: 'Channel Partners',
  LEVEL_2: 'Qualitrol Sales', 
  LEVEL_3: 'Directors',
  ADMIN: 'Administrators',
  FINANCE: 'Finance'
};