import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Search, 
  Plus, 
  UserCheck, 
  Eye, 
  Edit,
  Trash2,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';

const supabase = getSupabaseClient();

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string;
}

interface UserPermission {
  id: string;
  user_id: string;
  permission_type: 'view' | 'edit' | 'admin';
  enabled: boolean;
  created_at: string;
  user: UserProfile;
}

interface UserSharingManagerProps {
  onClose?: () => void;
}

export const UserSharingManager: React.FC<UserSharingManagerProps> = ({ onClose }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedPermissionType, setSelectedPermissionType] = useState<'view' | 'edit' | 'admin'>('view');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchPermissions();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, department')
        .eq('user_status', 'active')
        .order('first_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select(`
          *,
          user:profiles!user_permissions_user_id_fkey(
            id, email, first_name, last_name, role, department
          )
        `)
        .eq('resource_type', 'quotes')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPermissions(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const grantPermissions = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: 'No Users Selected',
        description: 'Please select at least one user to grant permissions to.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const permissionInserts = Array.from(selectedUsers).map(userId => ({
        user_id: userId,
        granted_by: user.id,
        permission_type: selectedPermissionType,
        resource_type: 'quotes',
        enabled: true
      }));

      const { error } = await supabase
        .from('user_permissions')
        .insert(permissionInserts)
        .select();

      if (error) throw error;

      toast({
        title: 'Permissions Granted',
        description: `${selectedPermissionType} permissions granted to ${selectedUsers.size} user(s).`
      });

      setSelectedUsers(new Set());
      await fetchPermissions();
    } catch (error) {
      console.error('Error granting permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to grant permissions',
        variant: 'destructive'
      });
    }
  };

  const getPermissionIcon = (type: string) => {
    switch (type) {
      case 'view': return <Eye className="h-4 w-4" />;
      case 'edit': return <Edit className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      default: return <UserCheck className="h-4 w-4" />;
    }
  };

  const getPermissionColor = (type: string) => {
    switch (type) {
      case 'view': return 'bg-blue-600';
      case 'edit': return 'bg-green-600';
      case 'admin': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-white">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5" />
            User Sharing & Permissions Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-white">Search Users</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="w-48">
              <Label className="text-white">Permission Type</Label>
              <Select value={selectedPermissionType} onValueChange={(value: 'view' | 'edit' | 'admin') => setSelectedPermissionType(value)}>
                <SelectTrigger className="mt-1 bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="edit">View & Edit</SelectItem>
                  <SelectItem value="admin">Full Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grant Permissions Action */}
          {selectedUsers.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="text-white">
                {selectedUsers.size} user(s) selected for {selectedPermissionType} permissions
              </div>
              <Button
                onClick={grantPermissions}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Grant Permissions
              </Button>
            </div>
          )}

          {/* Users List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedUsers.has(user.id)
                    ? 'bg-blue-900/30 border-blue-600'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => toggleUserSelection(user.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                  />
                  <div>
                    <div className="text-white font-medium">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-gray-400 text-sm">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {user.role}
                  </Badge>
                  {user.department && (
                    <Badge variant="secondary" className="text-xs">
                      {user.department}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No users found matching your search criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Permissions (if any exist) */}
      {permissions.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Current Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${getPermissionColor(permission.permission_type)}`}>
                      {getPermissionIcon(permission.permission_type)}
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {permission.user.first_name} {permission.user.last_name}
                      </div>
                      <div className="text-gray-400 text-sm">{permission.user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPermissionColor(permission.permission_type)}>
                      {permission.permission_type}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};