/**
 * 2025 Qualitrol Corp. All rights reserved.
 */

import { useState, useEffect } from "react";
import { User } from "@/types/auth";
import { UserRegistrationRequest, SecurityAuditLog } from "@/types/user-management";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  AlertTriangle,
  UserCheck,
  UserX,
  Activity,
  Trash2,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

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

interface UserManagementEnhancedProps {
  user: User;
}

const UserManagementEnhanced = ({ user }: UserManagementEnhancedProps) => {
  const [selectedRequest, setSelectedRequest] = useState<UserRegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserToRemove, setSelectedUserToRemove] = useState<UserProfile | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createUserData, setCreateUserData] = useState<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    department: string;
  }>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'level1',
    department: ''
  });

  // Mock data for registration requests - in real app this would come from API
  const [pendingRequests, setPendingRequests] = useState<UserRegistrationRequest[]>([
    {
      id: 'REG-2024-001',
      email: 'john.smith@acmepower.com',
      firstName: 'John',
      lastName: 'Smith',
      department: 'sales',
      jobTitle: 'Senior Sales Engineer',
      phoneNumber: '+1 (555) 123-4567',
      businessJustification: 'I need access to the PowerQuotePro system to generate quotes for our utility customers.',
      requestedRole: 'level2',
      managerEmail: 'manager@acmepower.com',
      companyName: 'ACME Power Solutions',
      status: 'pending',
      createdAt: '2024-01-16T10:30:00Z',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      loginAttempts: 0,
      isLocked: false,
      twoFactorEnabled: false,
      agreedToTerms: true,
      agreedToPrivacyPolicy: true
    }
  ]);

  const auditLogs: SecurityAuditLog[] = [
    {
      id: 'AUDIT-001',
      userId: 'REG-2024-001',
      action: 'Registration Request Submitted',
      details: 'New user registration request for Level 2 access',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      timestamp: '2024-01-16T10:30:00Z',
      severity: 'low'
    }
  ];

  // Fetch user profiles
  const fetchUserProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserProfiles(data || []);
    } catch (error) {
      console.error('Error fetching user profiles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user profiles.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfiles();
  }, []);

  const handleRemoveUser = async (userProfile: UserProfile) => {
    try {
      // Call the deactivate_user function
      const { error } = await supabase.rpc('deactivate_user', {
        target_user_id: userProfile.id
      });

      if (error) throw error;

      toast({
        title: "User Removed",
        description: `${userProfile.first_name} ${userProfile.last_name} has been deactivated.`,
      });

      // Refresh the user list
      await fetchUserProfiles();
      setIsRemoveDialogOpen(false);
      setSelectedUserToRemove(null);

    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove user.",
        variant: "destructive",
      });
    }
  };

  const handleApproveRequest = (requestId: string) => {
    setPendingRequests(prev => 
      prev.map(req => 
        req.id === requestId 
          ? { 
              ...req, 
              status: 'approved', 
              reviewedAt: new Date().toISOString(),
              reviewedBy: user.id 
            }
          : req
      )
    );
    console.log(`Approved registration request: ${requestId}`);
  };

  const handleRejectRequest = () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    setPendingRequests(prev => 
      prev.map(req => 
        req.id === selectedRequest.id 
          ? { 
              ...req, 
              status: 'rejected', 
              reviewedAt: new Date().toISOString(),
              reviewedBy: user.id,
              rejectionReason: rejectionReason.trim()
            }
          : req
      )
    );
    
    setIsReviewDialogOpen(false);
    setSelectedRequest(null);
    setRejectionReason('');
  };

  const getStatusBadge = (status: UserRegistrationRequest['status']) => {
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

  const getUserStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-600',
      inactive: 'bg-red-600',
      suspended: 'bg-yellow-600'
    };
    
    return (
      <Badge className={`${colors[status as keyof typeof colors] || 'bg-gray-600'} text-white text-xs`}>
        {status.toUpperCase()}
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

  const createUser = async () => {
    try {
      // First create the auth user
      const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
        email: createUserData.email,
        password: createUserData.password,
        user_metadata: {
          first_name: createUserData.firstName,
          last_name: createUserData.lastName,
          role: createUserData.role,
          department: createUserData.department
        }
      });

      if (authError) throw authError;

      // Then create the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: createUserData.email,
          first_name: createUserData.firstName,
          last_name: createUserData.lastName,
          role: createUserData.role,
          department: createUserData.department,
          user_status: 'active'
        });

      if (profileError) throw profileError;

      toast({
        title: "User Created",
        description: "New user has been successfully created and an email has been sent to them.",
      });

      // Reset form and close dialog
      setCreateUserData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'level1',
        department: ''
      });
      setIsCreateDialogOpen(false);

      // Refresh the user list
      await fetchUserProfiles();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user.",
        variant: "destructive",
      });
    }
  };

  // Check if current user is admin
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">User Management</h2>
          <p className="text-gray-400">Manage users, registration requests, and security auditing</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={fetchUserProfiles}
            variant="outline"
            size="sm"
            disabled={loading}
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isAdmin && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              variant="outline"
              size="sm"
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              <User className="h-4 w-4 mr-2" />
              Create User
            </Button>
          )}
          <div className="text-right">
            <p className="text-sm text-gray-400">Pending Requests</p>
            <p className="text-2xl font-bold text-yellow-500">
              {pendingRequests.filter(r => r.status === 'pending').length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-green-500">
                  {userProfiles.filter(u => u.user_status === 'active').length}
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
                  {userProfiles.filter(u => u.user_status === 'inactive').length}
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
                  {userProfiles.length}
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
            User Profiles
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
                User Profiles ({userProfiles.length})
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage existing user accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-white text-center py-8">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-300">User</TableHead>
                      <TableHead className="text-gray-300">Role</TableHead>
                      <TableHead className="text-gray-300">Department</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Created</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userProfiles.map((profile) => (
                      <TableRow key={profile.id} className="border-gray-800">
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">
                              {profile.first_name} {profile.last_name}
                            </p>
                            <p className="text-sm text-gray-400">{profile.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            {profile.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {profile.department || '-'}
                        </TableCell>
                        <TableCell>
                          {getUserStatusBadge(profile.user_status)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {profile.role !== 'admin' && profile.user_status === 'active' && (
                              <Button
                                onClick={() => {
                                  setSelectedUserToRemove(profile);
                                  setIsRemoveDialogOpen(true);
                                }}
                                size="sm"
                                variant="destructive"
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
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
                        {getStatusBadge(request.status)}
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

      {/* User Removal Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Remove User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-red-600 bg-red-600/10">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-200">
                This will deactivate the user account and revoke their access to the system.
                {selectedUserToRemove && (
                  <div className="mt-2 font-medium">
                    User: {selectedUserToRemove.first_name} {selectedUserToRemove.last_name} ({selectedUserToRemove.email})
                  </div>
                )}
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsRemoveDialogOpen(false)}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedUserToRemove && handleRemoveUser(selectedUserToRemove)}
                variant="destructive"
              >
                Remove User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <input
                id="email"
                type="email"
                value={createUserData.email}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, email: e.target.value }))}
                className="rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <input
                id="password"
                type="password"
                value={createUserData.password}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, password: e.target.value }))}
                className="rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <input
                id="firstName"
                type="text"
                value={createUserData.firstName}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, firstName: e.target.value }))}
                className="rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <input
                id="lastName"
                type="text"
                value={createUserData.lastName}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, lastName: e.target.value }))}
                className="rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={createUserData.role}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, role: e.target.value }))}
                className="rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                <option value="level1">Level 1</option>
                <option value="level2">Level 2</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <input
                id="department"
                type="text"
                value={createUserData.department}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, department: e.target.value }))}
                className="rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createUser}>Create User</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementEnhanced;
