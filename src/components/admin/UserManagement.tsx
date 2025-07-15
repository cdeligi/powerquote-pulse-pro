import { useState, useEffect } from "react";
import { User } from "@/types/auth";
import { UserRegistrationRequest, SecurityAuditLog } from "@/types/user-management";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  AlertTriangle,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Activity,
  UserPlus,
  RefreshCw
} from "lucide-react";

interface MergedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department: string | null;
  confirmedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  userStatus: string;
}

interface UserManagementProps {
  user: User;
}

const UserManagement = ({ user }: UserManagementProps) => {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<UserRegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [users, setUsers] = useState<MergedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Create user form state
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'level1',
    department: '',
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

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/admin-users`, {
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

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/admin-users`, {
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
          password: createUserForm.password || undefined
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      if (result.warning) {
        toast({
          title: "Warning",
          description: `${result.warning}. Temporary password: ${result.tempPassword}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `User created successfully! Temporary password: ${result.tempPassword}`,
        });
      }

      // Reset form and close dialog
      setCreateUserForm({
        email: '',
        firstName: '',
        lastName: '',
        role: 'level1',
        department: '',
        password: ''
      });
      setIsCreateUserDialogOpen(false);
      
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

  // Update user status using edge function
  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/admin-users`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          status
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user status');
      }

      toast({
        title: "Success",
        description: "User status updated successfully!",
      });

      // Refresh users list
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const [pendingRequests] = useState<UserRegistrationRequest[]>([]);
  const auditLogs: SecurityAuditLog[] = [];

  const handleApproveRequest = (requestId: string) => {
    console.log(`Approved registration request: ${requestId}`);
  };

  const handleRejectRequest = () => {
    if (!selectedRequest || !rejectionReason.trim()) return;
    setIsReviewDialogOpen(false);
    setSelectedRequest(null);
    setRejectionReason('');
  };

  const getRequestStatusBadge = (status: UserRegistrationRequest['status']) => {
    const badges = {
      pending: { color: 'bg-yellow-600', icon: Clock, text: 'Pending' },
      under_review: { color: 'bg-blue-600', icon: Eye, text: 'Under Review' },
      approved: { color: 'bg-green-600', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-600', icon: XCircle, text: 'Rejected' }
    };
    
    const badge = badges[status];
    const Icon = badge.icon;
    
    return (
      <Badge className={`${badge.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: SecurityAuditLog['severity']) => {
    const colors = {
      low: 'bg-gray-600',
      medium: 'bg-yellow-600', 
      high: 'bg-orange-600',
      critical: 'bg-red-600'
    };
    
    return (
      <Badge className={`${colors[severity]} text-white text-xs`}>
        {severity.toUpperCase()}
      </Badge>
    );
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
          <p className="text-gray-400">Manage users and registration requests</p>
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
          <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Create New User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
                <div>
                  <Label htmlFor="department" className="text-gray-400">Department</Label>
                  <Input
                    id="department"
                    value={createUserForm.department}
                    onChange={(e) => setCreateUserForm({...createUserForm, department: e.target.value})}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Optional"
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
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateUserDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} className="bg-green-600 hover:bg-green-700">
                    Create User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                <p className="text-sm text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {pendingRequests.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
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
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="users" className="text-white data-[state=active]:bg-red-600">
            Active Users
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-white data-[state=active]:bg-red-600">
            Registration Requests
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-white data-[state=active]:bg-red-600">
            Security Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Active Users
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
                      <TableHead className="text-gray-300">Department</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Created</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((mergedUser) => (
                      <TableRow key={mergedUser.id} className="border-gray-800">
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">
                              {mergedUser.fullName}
                            </p>
                            <p className="text-xs text-gray-500">{mergedUser.id}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {mergedUser.email}
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(mergedUser.role)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {mergedUser.department || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {getUserStatusBadge(mergedUser.userStatus)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(mergedUser.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {mergedUser.userStatus === 'active' ? (
                              <Button
                                onClick={() => handleUpdateUserStatus(mergedUser.id, 'inactive')}
                                size="sm"
                                variant="outline"
                                className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                                disabled={mergedUser.role === 'admin'}
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleUpdateUserStatus(mergedUser.id, 'active')}
                                size="sm"
                                variant="outline"
                                className="text-green-400 border-green-400 hover:bg-green-400 hover:text-white"
                              >
                                <Unlock className="h-4 w-4" />
                              </Button>
                            )}
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
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                User Registration Requests
              </CardTitle>
              <CardDescription className="text-gray-400">
                Review and approve user access requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300">Company</TableHead>
                    <TableHead className="text-gray-300">Role</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Submitted</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id} className="border-gray-800">
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">
                            {request.firstName} {request.lastName}
                          </p>
                          <p className="text-sm text-gray-400">{request.email}</p>
                          <p className="text-xs text-gray-500">{request.jobTitle}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {request.companyName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-blue-400 border-blue-400">
                          {request.requestedRole === 'level1' ? 'Level 1 Sales' : 'Level 2 Sales'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getRequestStatusBadge(request.status)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-white border-gray-600">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-white">
                                  Registration Request Details
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-gray-400">Name</Label>
                                    <p className="text-white">{request.firstName} {request.lastName}</p>
                                  </div>
                                  <div>
                                    <Label className="text-gray-400">Email</Label>
                                    <p className="text-white">{request.email}</p>
                                  </div>
                                  <div>
                                    <Label className="text-gray-400">Company</Label>
                                    <p className="text-white">{request.companyName}</p>
                                  </div>
                                  <div>
                                    <Label className="text-gray-400">Department</Label>
                                    <p className="text-white">{request.department}</p>
                                  </div>
                                  <div>
                                    <Label className="text-gray-400">Manager Email</Label>
                                    <p className="text-white">{request.managerEmail}</p>
                                  </div>
                                  <div>
                                    <Label className="text-gray-400">Requested Role</Label>
                                    <p className="text-white">
                                      {request.requestedRole === 'level1' ? 'Level 1 Sales' : 'Level 2 Sales'}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-gray-400">Business Justification</Label>
                                  <p className="text-white bg-gray-800 p-3 rounded mt-1">
                                    {request.businessJustification}
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <Label className="text-gray-400">IP Address</Label>
                                    <p className="text-white">{request.ipAddress}</p>
                                  </div>
                                  <div>
                                    <Label className="text-gray-400">Submitted</Label>
                                    <p className="text-white">
                                      {new Date(request.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {request.status === 'pending' && (
                            <>
                              <Button
                                onClick={() => handleApproveRequest(request.id)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setIsReviewDialogOpen(true);
                                }}
                                size="sm"
                                variant="destructive"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Security Audit Log
              </CardTitle>
              <CardDescription className="text-gray-400">
                System security events and user activity monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-300">Timestamp</TableHead>
                    <TableHead className="text-gray-300">Action</TableHead>
                    <TableHead className="text-gray-300">Details</TableHead>
                    <TableHead className="text-gray-300">IP Address</TableHead>
                    <TableHead className="text-gray-300">Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} className="border-gray-800">
                      <TableCell className="text-gray-300">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {log.action}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {log.details}
                      </TableCell>
                      <TableCell className="text-gray-300 font-mono text-sm">
                        {log.ipAddress}
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(log.severity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Registration Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-red-600 bg-red-600/10">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-200">
                This action will reject the user registration request and notify the applicant.
              </AlertDescription>
            </Alert>
            
            <div>
              <Label htmlFor="rejection-reason" className="text-white">
                Rejection Reason *
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white mt-2"
                placeholder="Please provide a clear reason for rejecting this request..."
                rows={4}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsReviewDialogOpen(false)}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectRequest}
                disabled={!rejectionReason.trim()}
                variant="destructive"
              >
                Reject Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
