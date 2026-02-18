import { useEffect, useState } from 'react';
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useAuth } from '@/hooks/useAuth';
import { Role, UserFeatureOverride } from '@/types/auth';

const supabase = getSupabaseClient();

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

        // Fetch role defaults (load all + filter client-side to avoid enum literal mismatches)
        const { data: allRoleDefaults, error: roleError } = await supabase
          .from('role_feature_defaults')
          .select('role, feature_key, allowed');

        if (roleError) throw roleError;

        const normalizedUserRole = String(user.role || '').toLowerCase();
        const roleAliases: Record<string, string[]> = {
          level1: ['level1','level_1','sales'],
          level2: ['level2','level_2'],
          level3: ['level3','level_3'],
          admin: ['admin'],
          finance: ['finance'],
          master: ['master'],
        };
        const aliases = roleAliases[normalizedUserRole] || [normalizedUserRole];
        const roleDefaults = (allRoleDefaults || []).filter((row: any) => aliases.includes(String(row.role || '').toLowerCase()));

        // Fetch user overrides
        const { data: userOverrides, error: overrideError } = await supabase
          .from('user_feature_overrides')
          .select('feature_key, allowed')
          .eq('user_id', user.id);

        if (overrideError) throw overrideError;

        // Build effective permissions map
        const effectivePermissions: Record<string, boolean> = {};

        // Start with role defaults
        roleDefaults?.forEach(({ feature_key, allowed }: any) => {
          effectivePermissions[feature_key] = Boolean(allowed);
        });

        // Apply user overrides (null means no override, use default)
        userOverrides?.forEach(({ feature_key, allowed }: any) => {
          if (allowed !== null) {
            effectivePermissions[feature_key] = Boolean(allowed);
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
  BOM_EDIT_PRICE: 'FEATURE_BOM_EDIT_PRICE',
  BOM_SHOW_PARTNER_COMMISSION: 'FEATURE_BOM_SHOW_PARTNER_COMMISSION',
  ACCESS_ADMIN_PANEL: 'FEATURE_ACCESS_ADMIN_PANEL'
} as const;

// Role labels for UI display
export const ROLE_LABELS: Record<Role, string> = {
  SALES: 'Sales',
  ADMIN: 'Admin Reviewer',
  FINANCE: 'Finance',
  MASTER: 'Master Operator'
};
