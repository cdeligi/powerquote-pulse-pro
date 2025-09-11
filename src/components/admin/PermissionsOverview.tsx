import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getSupabaseClient, getSupabaseAdminClient, isAdminAvailable } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdminClient();;
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

const ROLES = ['ADMIN', 'FINANCE', 'LEVEL_3', 'LEVEL_2', 'LEVEL_1'] as const;

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
  }
  // ... other features
];

export default function PermissionsOverview() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [roleDefaults, setRoleDefaults] = useState<RoleDefault[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Try to fetch features from database
        const featuresResult = await supabase.from('features').select('*').order('label');
        
        // If no features in DB, use defaults
        const features = featuresResult.data?.length ? featuresResult.data : DEFAULT_FEATURES;
        
        // Ensure all default features exist in the database
        if (!featuresResult.data?.length) {
          await supabase.from('features').upsert(DEFAULT_FEATURES);
        }

        const roleDefaultsResult = await supabase.from('role_feature_defaults').select('*');
        
        setFeatures(features);
        setRoleDefaults(roleDefaultsResult.data || []);
      } catch (err) {
        console.error('Error fetching permissions data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getPermissionForRole = (featureKey: string, role: string): boolean => {
    const roleDefault = roleDefaults.find(
      rd => rd.feature_key === featureKey && rd.role === role
    );
    return roleDefault?.allowed || false;
  };

  const updateRolePermission = async (featureKey: string, role: string, allowed: boolean) => {
    try {
      setSaving(true);
      
      // Update local state first for immediate UI feedback
      setRoleDefaults(prev => {
        const existing = prev.find(rd => rd.role === role && rd.feature_key === featureKey);
        if (existing) {
          return prev.map(rd => 
            rd.role === role && rd.feature_key === featureKey 
              ? { ...rd, allowed } 
              : rd
          );
        }
        return [...prev, { role, feature_key: featureKey, allowed }];
      });

      // Update in database
      const { error } = await supabase
        .from('role_feature_defaults')
        .upsert(
          { role, feature_key: featureKey, allowed },
          { onConflict: 'role,feature_key' }
        );

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Updated permission for ${role}`,
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission. Please try again.",
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
        <CardTitle>Permissions Overview</CardTitle>
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
                    {role.replace('_', ' ')}
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