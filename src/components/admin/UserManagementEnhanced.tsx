
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, UserPlus, Settings, Users } from 'lucide-react';
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
}

const UserManagementEnhanced = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchProfiles();
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500 text-white';
      case 'level2':
        return 'bg-blue-500 text-white';
      case 'level1':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-600 text-white';
      case 'inactive':
        return 'bg-red-600 text-white';
      default:
        return 'bg-yellow-600 text-white';
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
          <p className="text-gray-400">Manage user accounts, roles, and permissions</p>
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
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getRoleBadgeColor(profile.role)}>
                          {profile.role.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusBadgeColor(profile.user_status)}>
                          {profile.user_status || 'PENDING'}
                        </Badge>
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
      </Tabs>
    </div>
  );
};

export default UserManagementEnhanced;
