
import { useState, useEffect } from "react";
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  UserCheck,
  UserX,
  Clock,
  UserPlus,
  RefreshCw,
  Edit,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import UserEditDialog from "./UserEditDialog";
import UserRequestsTab from "./UserRequestsTab";
import AuditLogTab from "./AuditLogTab";

interface MergedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department: string | null;
  userStatus: string;
  jobTitle?: string | null;
  phoneNumber?: string | null;
  managerEmail?: string | null;
  companyName?: string | null;
  businessJustification?: string | null;
  confirmedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string;
}

interface UserManagementProps {
  user: User;
}

const UserManagement = ({ user }: UserManagementProps) => {
  const [users, setUsers] = useState<MergedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<MergedUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Create user form state
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'level1',
    department: '',
    jobTitle: '',
    phoneNumber: '',
    managerEmail: '',
    companyName: '',
    businessJustification: '',
    password: ''
  });

  // Load real users from edge function
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`https://cwhmxpitwblqxgrvaigg.supabase.co/functions/v1/admin-users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load users');
      }

      const { users: fetchedUsers } = await response.json();
      setUsers(fetchedUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers();
    }
  }, [user]);

  // Create new user using edge function
  const handleCreateUser = async () => {
    try {
      // Validate form
      if (!createUserForm.email || !createUserForm.firstName || !createUserForm.lastName) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`https://cwhmxpitwblqxgrvaigg.supabase.co/functions/v1/admin-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: createUserForm.email,
          firstName: createUserForm.firstName,
          lastName: createUserForm.lastName,
          role: createUserForm.role,
          department: createUserForm.department || null,
          jobTitle: createUserForm.jobTitle || null,
          phoneNumber: createUserForm.phoneNumber || null,
          managerEmail: createUserForm.managerEmail || null,
          companyName: createUserForm.companyName || null,
          businessJustification: createUserForm.businessJustification || null,
          password: createUserForm.password || undefined
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      toast({
        title: "Success",
        description: `User created successfully! Temporary password: ${result.tempPassword}`,
      });

      // Reset form and close dialog
      setCreateUserForm({
        email: '',
        firstName: '',
        lastName: '',
        role: 'level1',
        department: '',
        jobTitle: '',
        phoneNumber: '',
        managerEmail: '',
        companyName: '',
        businessJustification: '',
        password: ''
      });
      
      // Refresh users list
      loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update user using edge function
  const handleUpdateUser = async (userData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`https://cwhmxpitwblqxgrvaigg.supabase.co/functions/v1/admin-users`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      // Refresh users list
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-600',
      finance: 'bg-purple-600',
      level2: 'bg-blue-600',
      level1: 'bg-green-600'
    };
    return (
      <Badge className={`${colors[role as keyof typeof colors] || 'bg-gray-600'} text-white`}>
        {role.toUpperCase()}
      </Badge>
    );
  };

  const getUserStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-600',
      inactive: 'bg-red-600',
      suspended: 'bg-yellow-600'
    };
    return (
      <Badge className={`${colors[status as keyof typeof colors] || 'bg-gray-600'} text-white`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">User Management</h2>
          <p className="text-gray-400">Manage users, requests, and security auditing</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={loadUsers}
            variant="outline"
            size="sm"
            disabled={loadingUsers}
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="text-right">
            <p className="text-sm text-gray-400">Total Users</p>
            <p className="text-2xl font-bold text-blue-500">
              {users.length}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-green-500">
                  {users.filter(u => u.userStatus === 'active').length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Inactive</p>
                <p className="text-2xl font-bold text-red-500">
                  {users.filter(u => u.userStatus === 'inactive').length}
                </p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Admins</p>
                <p className="text-2xl font-bold text-purple-500">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-blue-500">
                  {users.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger value="users" className="text-white data-[state=active]:bg-red-600">
            Users
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-white data-[state=active]:bg-red-600">
            User Requests
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-white data-[state=active]:bg-red-600">
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="create" className="text-white data-[state=active]:bg-red-600">
            Create User
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Active Users ({users.length})
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage existing users and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <div className="text-gray-400">Loading users...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-300">User</TableHead>
                      <TableHead className="text-gray-300">Email</TableHead>
                      <TableHead className="text-gray-300">Role</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Company</TableHead>
                      <TableHead className="text-gray-300">Last Sign In</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((mergedUser) => (
                      <TableRow key={mergedUser.id} className="border-gray-800">
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">
                              {mergedUser.fullName || 'Unnamed User'}
                            </p>
                            {mergedUser.jobTitle && (
                              <p className="text-xs text-gray-400">{mergedUser.jobTitle}</p>
                            )}
                            {mergedUser.department && (
                              <p className="text-xs text-gray-500">{mergedUser.department}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {mergedUser.email}
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(mergedUser.role)}
                        </TableCell>
                        <TableCell>
                          {getUserStatusBadge(mergedUser.userStatus)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {mergedUser.companyName || 'N/A'}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {mergedUser.lastSignInAt ? 
                            new Date(mergedUser.lastSignInAt).toLocaleDateString() : 
                            'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => {
                                setSelectedUserToEdit(mergedUser);
                                setIsEditDialogOpen(true);
                              }}
                              size="sm"
                              variant="outline"
                              className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">User Requests</CardTitle>
              <CardDescription className="text-gray-400">
                Review and approve user access requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserRequestsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Security Audit Log</CardTitle>
              <CardDescription className="text-gray-400">
                System security events and user activity monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <UserPlus className="h-5 w-5 mr-2" />
                Create New User
              </CardTitle>
              <CardDescription className="text-gray-400">
                Create a new user account with specified role and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-gray-400">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createUserForm.email}
                    onChange={(e) => setCreateUserForm({...createUserForm, email: e.target.value})}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="user@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="role" className="text-gray-400">Role</Label>
                  <Select value={createUserForm.role} onValueChange={(value) => setCreateUserForm({...createUserForm, role: value})}>
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
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-gray-400">First Name *</Label>
                  <Input
                    id="firstName"
                    value={createUserForm.firstName}
                    onChange={(e) => setCreateUserForm({...createUserForm, firstName: e.target.value})}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-gray-400">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={createUserForm.lastName}
                    onChange={(e) => setCreateUserForm({...createUserForm, lastName: e.target.value})}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department" className="text-gray-400">Department</Label>
                  <Input
                    id="department"
                    value={createUserForm.department}
                    onChange={(e) => setCreateUserForm({...createUserForm, department: e.target.value})}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="e.g. Engineering"
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle" className="text-gray-400">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={createUserForm.jobTitle}
                    onChange={(e) => setCreateUserForm({...createUserForm, jobTitle: e.target.value})}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="e.g. Software Engineer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phoneNumber" className="text-gray-400">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={createUserForm.phoneNumber}
                    onChange={(e) => setCreateUserForm({...createUserForm, phoneNumber: e.target.value})}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="companyName" className="text-gray-400">Company Name</Label>
                  <Input
                    id="companyName"
                    value={createUserForm.companyName}
                    onChange={(e) => setCreateUserForm({...createUserForm, companyName: e.target.value})}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Company name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="managerEmail" className="text-gray-400">Manager Email</Label>
                <Input
                  id="managerEmail"
                  type="email"
                  value={createUserForm.managerEmail}
                  onChange={(e) => setCreateUserForm({...createUserForm, managerEmail: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="manager@company.com"
                />
              </div>

              <div>
                <Label htmlFor="businessJustification" className="text-gray-400">Business Justification</Label>
                <Textarea
                  id="businessJustification"
                  value={createUserForm.businessJustification}
                  onChange={(e) => setCreateUserForm({...createUserForm, businessJustification: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Business justification for access..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-gray-400">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm({...createUserForm, password: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Leave blank to auto-generate"
                />
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleCreateUser} className="bg-green-600 hover:bg-green-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Edit Dialog */}
      <UserEditDialog
        user={selectedUserToEdit}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedUserToEdit(null);
        }}
        onSave={handleUpdateUser}
      />
    </div>
  );
};

export default UserManagement;
