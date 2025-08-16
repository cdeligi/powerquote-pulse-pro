import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Feature {
  key: string;
  label: string;
  description: string;
}

interface RoleDefault {
  role: string;
  feature_key: string;
  allowed: boolean;
}

const ROLES = ['ADMIN', 'FINANCE', 'LEVEL_3', 'LEVEL_2', 'LEVEL_1'] as const;

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
        
        // Fetch features and role defaults
        const [featuresResult, roleDefaultsResult] = await Promise.all([
          supabase.from('features').select('*').order('label'),
          supabase.from('role_feature_defaults').select('*')
        ]);

        if (featuresResult.error) throw featuresResult.error;
        if (roleDefaultsResult.error) throw roleDefaultsResult.error;

        setFeatures(featuresResult.data || []);
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

      const { error } = await supabase
        .from('role_feature_defaults')
        .upsert({
          role: role as any,
          feature_key: featureKey,
          allowed
        });

      if (error) throw error;

      // Update local state optimistically
      setRoleDefaults(prev => {
        const existing = prev.find(rd => rd.feature_key === featureKey && rd.role === role);
        if (existing) {
          return prev.map(rd => 
            rd.feature_key === featureKey && rd.role === role 
              ? { ...rd, allowed }
              : rd
          );
        } else {
          return [...prev, { role, feature_key: featureKey, allowed }];
        }
      });

      toast({
        title: 'Success',
        description: 'Permission updated successfully.'
      });

    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to update permission.',
        variant: 'destructive'
      });
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