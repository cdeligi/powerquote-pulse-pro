
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, UserPlus, Settings, Users, Edit, Shield, MapPin, Clock } from 'lucide-react';
import UserCreationForm from './UserCreationForm';

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  department: string | null;
  user_status: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  last_login_ip: string | null;
  login_count: number;
  failed_login_attempts: number;
  account_locked_until: string | null;
  two_factor_enabled: boolean;
}

interface SecurityAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
  severity: string;
}

const UserManagementEnhanced = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    department: '',
    user_status: ''
  });

  useEffect(() => {
    fetchProfiles();
    fetchAuditLogs();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching profiles:', error);
        toast({
          title: "Error",
          description: "Failed to fetch user profiles",
          variant: "destructive",
        });
        return;
      }

      setProfiles(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching audit logs:', error);
        return;
      }

      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('profiles')
        .update({ user_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `User status updated to ${newStatus}`,
      });

      fetchProfiles();
    } catch (error: any) {
      console.error('Status update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (profile: Profile) => {
    setEditingUser(profile);
    setEditForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      email: profile.email,
      role: profile.role,
      department: profile.department || '',
      user_status: profile.user_status || 'active'
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          role: editForm.role,
          department: editForm.department,
          user_status: editForm.user_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setEditingUser(null);
      fetchProfiles();
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500 text-white';
      case 'finance': return 'bg-purple-500 text-white';
      case 'level2': return 'bg-blue-500 text-white';
      case 'level1': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-600 text-white';
      case 'inactive': return 'bg-red-600 text-white';
      default: return 'bg-yellow-600 text-white';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const query = searchQuery.toLowerCase();
    return (
      profile.email.toLowerCase().includes(query) ||
      profile.first_name?.toLowerCase().includes(query) ||
      profile.last_name?.toLowerCase().includes(query) ||
      profile.role.toLowerCase().includes(query) ||
      profile.department?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full max-w-none p-6 space-y-6 bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">User Management</h1>
          <p className="text-gray-400">Manage user accounts, roles, and security</p>
        </div>
        <Button 
          onClick={fetchProfiles} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Users className="mr-2 h-4 w-4" />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-gray-800 border-gray-700">
          <TabsTrigger value="users" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Users className="mr-2 h-4 w-4" />
            Users ({profiles.length})
          </TabsTrigger>
          <TabsTrigger value="create" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <UserPlus className="mr-2 h-4 w-4" />
            Create User
          </TabsTrigger>
          <TabsTrigger value="security" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Shield className="mr-2 h-4 w-4" />
            Security Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex space-x-4">
            <Input
              placeholder="Search by name, email, role, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>

          {loading ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 text-center">
                <div className="text-white">Loading users...</div>
              </CardContent>
            </Card>
          ) : filteredProfiles.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 text-center">
                <div className="text-gray-400">No users found</div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredProfiles.map((profile) => (
                <Card key={profile.id} className="bg-gray-900 border-gray-800 hover:border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-300" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">
                            {profile.first_name} {profile.last_name}
                          </h3>
                          <p className="text-gray-400 text-sm">{profile.email}</p>
                          {profile.department && (
                            <p className="text-gray-500 text-xs">{profile.department}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {profile.last_login_at && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                Last: {new Date(profile.last_login_at).toLocaleDateString()}
                              </div>
                            )}
                            {profile.last_login_ip && (
                              <div className="flex items-center text-xs text-gray-500">
                                <MapPin className="h-3 w-3 mr-1" />
                                {profile.last_login_ip}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              Logins: {profile.login_count}
                            </div>
                            {profile.account_locked_until && new Date(profile.account_locked_until) > new Date() && (
                              <Badge className="bg-red-800 text-white text-xs">
                                Locked
                              </Badge>
                            )}
                            {profile.failed_login_attempts > 0 && (
                              <Badge className="bg-orange-600 text-white text-xs">
                                {profile.failed_login_attempts} failed attempts
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getRoleBadgeColor(profile.role)}>
                          {profile.role.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusBadgeColor(profile.user_status)}>
                          {profile.user_status || 'PENDING'}
                        </Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              onClick={() => handleEditUser(profile)}
                              variant="outline"
                              size="sm"
                              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900 border-gray-800 text-white">
                            <DialogHeader>
                              <DialogTitle>Edit User</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleUpdateUser} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="first_name" className="text-white">First Name</Label>
                                  <Input
                                    id="first_name"
                                    value={editForm.first_name}
                                    onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                                    className="bg-gray-800 border-gray-700 text-white"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="last_name" className="text-white">Last Name</Label>
                                  <Input
                                    id="last_name"
                                    value={editForm.last_name}
                                    onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                                    className="bg-gray-800 border-gray-700 text-white"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="email" className="text-white">Email</Label>
                                <Input
                                  id="email"
                                  type="email"
                                  value={editForm.email}
                                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                  className="bg-gray-800 border-gray-700 text-white"
                                />
                              </div>
                              <div>
                                <Label htmlFor="role" className="text-white">Role</Label>
                                <Select value={editForm.role} onValueChange={(value) => setEditForm({...editForm, role: value})}>
                                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-800 border-gray-700">
                                    <SelectItem value="level1">Level 1</SelectItem>
                                    <SelectItem value="level2">Level 2</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="finance">Finance</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="department" className="text-white">Department</Label>
                                <Input
                                  id="department"
                                  value={editForm.department}
                                  onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                                  className="bg-gray-800 border-gray-700 text-white"
                                />
                              </div>
                              <div>
                                <Label htmlFor="status" className="text-white">Status</Label>
                                <Select value={editForm.user_status} onValueChange={(value) => setEditForm({...editForm, user_status: value})}>
                                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-800 border-gray-700">
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                  Update User
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          onClick={() => handleStatusToggle(profile.id, profile.user_status || 'inactive')}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                        >
                          {profile.user_status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <UserCreationForm onUserCreated={fetchProfiles} />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Security Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge className={getSeverityColor(log.severity)}>
                        {log.severity.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="text-white font-medium">{log.action}</p>
                        <p className="text-gray-400 text-sm">
                          {log.ip_address} • {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">
                      {log.user_id && `User: ${log.user_id.substring(0, 8)}...`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagementEnhanced;
