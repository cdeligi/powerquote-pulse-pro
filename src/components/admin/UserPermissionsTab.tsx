import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RotateCcw } from 'lucide-react';
import { getSupabaseClient, getSupabaseAdminClient, isAdminAvailable } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdminClient();;
import { toast } from '@/hooks/use-toast';
import { Role, Feature, UserFeatureOverride } from '@/types/auth';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
}

interface UserPermissionsTabProps {
  userProfile: UserProfile;
}

interface FeaturePermission {
  feature: Feature;
  roleDefault: boolean;
  userOverride: boolean | null;
  effectivePermission: boolean;
}

const UserPermissionsTab = ({ userProfile }: UserPermissionsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [featurePermissions, setFeaturePermissions] = useState<FeaturePermission[]>([]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);

      // Fetch all features
      const { data: features, error: featuresError } = await supabase
        .from('features')
        .select('*')
        .order('label');

      if (featuresError) throw featuresError;

      // Fetch role defaults (load all + filter client-side to avoid enum literal mismatches)
      const { data: allRoleDefaults, error: roleError } = await supabase
        .from('role_feature_defaults')
        .select('role, feature_key, allowed');

      if (roleError) throw roleError;

      const normalizedUserRole = String(userProfile.role || '').toUpperCase();
      const roleDefaults = (allRoleDefaults || []).filter((row: any) => String(row.role || '').toUpperCase() === normalizedUserRole);

      // Fetch user overrides
      const { data: userOverrides, error: overrideError } = await supabase
        .from('user_feature_overrides')
        .select('feature_key, allowed')
        .eq('user_id', userProfile.id);

      if (overrideError) throw overrideError;

      // Build feature permissions - filter out BOM Edit Part Number
      const filteredFeatures = features?.filter(f => f.key !== 'FEATURE_BOM_EDIT_PART_NUMBER') || [];
      const roleDefaultsMap = new Map(roleDefaults?.map(rd => [rd.feature_key, rd.allowed]) || []);
      const userOverridesMap = new Map(userOverrides?.map(uo => [uo.feature_key, uo.allowed]) || []);

      const permissions: FeaturePermission[] = filteredFeatures.map(feature => {
        const roleDefault = roleDefaultsMap.has(feature.key) ? Boolean(roleDefaultsMap.get(feature.key)) : false;
        const userOverride = userOverridesMap.has(feature.key) ? (userOverridesMap.get(feature.key) as boolean | null) : null;
        const effectivePermission = userOverride !== null ? userOverride : roleDefault;

        return {
          feature,
          roleDefault,
          userOverride,
          effectivePermission
        };
      });

      setFeaturePermissions(permissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user permissions.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [userProfile.id, userProfile.role]);

  const updateUserOverride = async (featureKey: string, allowed: boolean | null) => {
    try {
      setSaving(true);

      if (allowed === null) {
        // Remove override (use role default)
        const { error } = await supabase
          .from('user_feature_overrides')
          .delete()
          .eq('user_id', userProfile.id)
          .eq('feature_key', featureKey);

        if (error) throw error;
      } else {
        // Set or update override
        const { error } = await supabase
          .from('user_feature_overrides')
          .upsert({
            user_id: userProfile.id,
            feature_key: featureKey,
            allowed
          }, { onConflict: 'user_id,feature_key' });

        if (error) throw error;
      }

      // Update local state optimistically
      setFeaturePermissions(prev => prev.map(fp => 
        fp.feature.key === featureKey 
          ? {
              ...fp,
              userOverride: allowed,
              effectivePermission: allowed !== null ? allowed : fp.roleDefault
            }
          : fp
      ));

      toast({
        title: 'Success',
        description: 'User permissions updated successfully.'
      });

    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user permission.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToRoleDefaults = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_feature_overrides')
        .delete()
        .eq('user_id', userProfile.id);

      if (error) throw error;

      // Update local state
      setFeaturePermissions(prev => prev.map(fp => ({
        ...fp,
        userOverride: null,
        effectivePermission: fp.roleDefault
      })));

      toast({
        title: 'Success',
        description: 'User permissions reset to role defaults.'
      });

    } catch (error) {
      console.error('Error resetting permissions:', error);
      toast({
        title: 'Error', 
        description: 'Failed to reset user permissions.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
        <span className="ml-2 text-white">Loading permissions...</span>
      </div>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">
            User Permissions for {userProfile.first_name} {userProfile.last_name}
          </CardTitle>
          <Button
            onClick={resetToRoleDefaults}
            disabled={saving}
            variant="outline"
            size="sm"
            className="text-white border-gray-600 hover:bg-gray-800"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Role Defaults
          </Button>
        </div>
        <p className="text-gray-400">
          Configure feature permissions for this user. Override settings take precedence over role defaults.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800">
              <TableHead className="text-gray-300">Feature</TableHead>
              <TableHead className="text-gray-300">Role Default</TableHead>
              <TableHead className="text-gray-300">User Override</TableHead>
              <TableHead className="text-gray-300">Effective Permission</TableHead>
              <TableHead className="text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {featurePermissions.map(({ feature, roleDefault, userOverride, effectivePermission }) => (
              <TableRow key={feature.key} className="border-gray-800">
                <TableCell>
                  <div>
                    <p className="font-medium text-white">{feature.label}</p>
                    <p className="text-sm text-gray-400">{feature.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleDefault ? 'default' : 'secondary'} className={roleDefault ? 'bg-green-600' : 'bg-gray-600'}>
                    {roleDefault ? 'Allowed' : 'Denied'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {userOverride !== null ? (
                    <Badge variant={userOverride ? 'default' : 'secondary'} className={userOverride ? 'bg-blue-600' : 'bg-orange-600'}>
                      {userOverride ? 'Allowed' : 'Denied'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-400 border-gray-600">
                      No Override
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={effectivePermission ? 'default' : 'secondary'} className={effectivePermission ? 'bg-green-600' : 'bg-red-600'}>
                    {effectivePermission ? 'Allowed' : 'Denied'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={effectivePermission}
                      disabled={saving}
                      onCheckedChange={(checked) => {
                        const newValue = checked as boolean;
                        // Only create override if different from role default
                        const override = newValue === roleDefault ? null : newValue;
                        updateUserOverride(feature.key, override);
                      }}
                      className="border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UserPermissionsTab;