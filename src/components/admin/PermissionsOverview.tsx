import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from "@/integrations/supabase/client";
import { Role } from '@/types/auth';

const supabase = getSupabaseClient();
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Feature {
  key: string;
  label: string;
  description: string;
  category?: string;
}

interface RoleDefault {
  role: string;
  feature_key: string;
  allowed: boolean;
}

const ROLES = ['level1', 'level2', 'level3', 'admin', 'finance', 'master'] as const;

const ROLE_ALIASES: Record<(typeof ROLES)[number], string[]> = {
  level1: ['level1', 'level_1', 'sales'],
  level2: ['level2', 'level_2'],
  level3: ['level3', 'level_3'],
  admin: ['admin'],
  finance: ['finance'],
  master: ['master'],
};

const ROLE_DB_CANONICAL: Record<(typeof ROLES)[number], string> = {
  level1: 'LEVEL_1',
  level2: 'LEVEL_2',
  level3: 'LEVEL_3',
  admin: 'ADMIN',
  finance: 'FINANCE',
  master: 'MASTER',
};

const roleMatches = (displayRole: (typeof ROLES)[number], dbRole: string): boolean => {
  const val = String(dbRole || '').toLowerCase();
  return ROLE_ALIASES[displayRole].includes(val);
};

const DEFAULT_FEATURES: Feature[] = [
  {
    key: 'FEATURE_BOM_SHOW_PRODUCT_COST',
    label: 'View Product Costs',
    description: 'Allows users to view product costs in BOM',
  },
  {
    key: 'FEATURE_BOM_SHOW_MARGIN',
    label: 'View Product Margins',
    description: 'Allows users to view margin percentages in BOM items',
  },
  {
    key: 'FEATURE_BOM_EDIT_PART_NUMBER',
    label: 'Edit Part Numbers',
    description: 'Allows users to edit part numbers in BOM',
  },
  {
    key: 'FEATURE_BOM_EDIT_PRICE',
    label: 'Edit Prices',
    description: 'Allows users to edit product prices in BOM',
  },
  {
    key: 'FEATURE_BOM_SHOW_PARTNER_COMMISSION',
    label: 'View Partner Commission',
    description: 'Allows users to view partner commission costs in BOM',
  },
  {
    key: 'FEATURE_ACCESS_ADMIN_PANEL',
    label: 'Access to Admin Panel',
    description: 'Allows user to open Admin Panel and manage administrative workflows.',
  }
];

export default function PermissionsOverview() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [roleDefaults, setRoleDefaults] = useState<RoleDefault[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch features from database
      const featuresResult = await supabase.from('features').select('*').order('label');
      
      if (featuresResult.error) {
        console.error('Error fetching features:', featuresResult.error);
        toast({
          title: "Warning",
          description: "Could not fetch features from database, using defaults.",
          variant: "destructive",
        });
      }
      
      // Merge DB features with DEFAULT_FEATURES (union by key)
      const dbFeatures = featuresResult.data || [];
      const dbFeatureKeys = new Set(dbFeatures.map(f => f.key));
      const missingDefaults = DEFAULT_FEATURES.filter(f => !dbFeatureKeys.has(f.key));
      const mergedFeatures = [...dbFeatures, ...missingDefaults];
      
      // Ensure all default features exist in the database
      if (missingDefaults.length > 0) {
        const { error: upsertError } = await supabase.from('features').upsert(missingDefaults, { onConflict: 'key' });
        if (upsertError) {
          console.error('Error upserting missing features:', upsertError);
        }
      }

      const roleDefaultsResult = await supabase.from('role_feature_defaults').select('*');
      
      if (roleDefaultsResult.error) {
        console.error('Error fetching role defaults:', roleDefaultsResult.error);
      }
      
      setFeatures(mergedFeatures);
      setRoleDefaults(roleDefaultsResult.data || []);
    } catch (err) {
      console.error('Error fetching permissions data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getPermissionForRole = (featureKey: string, role: (typeof ROLES)[number]): boolean => {
    const roleDefault = roleDefaults.find(
      rd => rd.feature_key === featureKey && roleMatches(role, rd.role)
    );
    return roleDefault?.allowed || false;
  };

  const updateRolePermission = async (featureKey: string, role: (typeof ROLES)[number], allowed: boolean) => {
    try {
      setSaving(true);
      
      // Update local state first for immediate UI feedback
      setRoleDefaults(prev => {
        const existing = prev.find(rd => rd.feature_key === featureKey && roleMatches(role, String(rd.role || '')));
        if (existing) {
          return prev.map(rd => 
            rd.feature_key === featureKey && roleMatches(role, String(rd.role || ''))
              ? { ...rd, allowed }
              : rd
          );
        }
        return [...prev, { role: ROLE_DB_CANONICAL[role], feature_key: featureKey, allowed } as any];
      });

      // Update in database (safe path without assuming composite unique constraint)
      const aliasValues = ROLE_ALIASES[role].map(v => v.toUpperCase());
      const { data: existingRows, error: existingError } = await supabase
        .from('role_feature_defaults')
        .select('id, role')
        .eq('feature_key', featureKey);

      if (existingError) throw existingError;

      const existing = (existingRows || []).find((row: any) => aliasValues.includes(String(row.role || '').toUpperCase()));
      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('role_feature_defaults')
          .update({ allowed })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const preferredRoleValue = ROLE_DB_CANONICAL[role];
        const { error: insertError } = await supabase
          .from('role_feature_defaults')
          .insert({ role: preferredRoleValue as any, feature_key: featureKey, allowed });
        if (insertError) throw insertError;
      }
      
      toast({
        title: "Success",
        description: `Updated permission for ${role}`,
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update permission. Please try again.",
        variant: "destructive",
      });
      // Revert local state on error
      setRoleDefaults(prev => 
        prev.map(rd => 
          rd.role === role && rd.feature_key === featureKey 
            ? { ...rd, allowed: !allowed } 
            : rd
        )
      );
    } finally {
      setSaving(false);
    }
  };

  // Filter out BOM Edit Part Number feature as it's controlled by admin panel access
  const filteredFeatures = features.filter(f => f.key !== 'FEATURE_BOM_EDIT_PART_NUMBER');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading permissions...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading permissions: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Permissions Overview</CardTitle>
          <Button
            onClick={fetchData}
            disabled={loading || saving}
            variant="outline"
            size="sm"
          >
            <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : 'hidden'}`} />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          View feature permissions by role. This shows the default permissions for each role.
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Feature</TableHead>
                {ROLES.map(role => (
                  <TableHead key={role} className="text-center">
                    {({level1:'Level 1',level2:'Level 2',level3:'Level 3',admin:'Admin',finance:'Finance',master:'Master'} as any)[role] || role}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeatures.map(feature => (
                <TableRow key={feature.key}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{feature.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {feature.description}
                      </div>
                    </div>
                  </TableCell>
                  {ROLES.map(role => {
                    const allowed = getPermissionForRole(feature.key, role);
                    return (
                      <TableCell key={role} className="text-center">
                        <Button
                          variant={allowed ? "default" : "secondary"}
                          size="sm"
                          disabled={saving}
                          onClick={() => updateRolePermission(feature.key, role, !allowed)}
                          className={allowed ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
                        >
                          {allowed ? 'Allowed' : 'Denied'}
                        </Button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {filteredFeatures.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No features configured yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}