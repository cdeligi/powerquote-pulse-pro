
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Users, UserPlus, Shield, Mail, Calendar, Search } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string;
  user_status: string;
  created_at: string;
  updated_at: string;
}

const UserManagementCore = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-600 text-white';
      case 'finance':
        return 'bg-green-600 text-white';
      case 'level2':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'active' ? 'bg-green-600 text-white' : 'bg-red-600 text-white';
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="text-white text-center">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              User Administration
            </div>
            <Badge variant="outline" className="text-blue-400 border-blue-600">
              {users.length} Total Users
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white flex-1"
            />
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-600 p-2 rounded-full">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="flex items-center space-x-2 text-gray-400 text-sm">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                        {user.department && (
                          <>
                            <span>•</span>
                            <span>{user.department}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-gray-500 text-xs mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusBadgeColor(user.user_status)}>
                      {user.user_status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementCore;
