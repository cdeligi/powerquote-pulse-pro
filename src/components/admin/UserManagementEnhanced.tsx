/**
 * © 2025 Qualitrol Corp. All rights reserved.
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { departmentService, Department } from "@/services/departmentService";
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
  RefreshCw,
  Shield,
  Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import UserPermissionsTab from "./UserPermissionsTab";
import UserEditDialog from "./UserEditDialog";
import PermissionsOverview from "./PermissionsOverview";

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
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRole, setNewRole] = useState<Role>('LEVEL_1'); // Default role
  const [newDepartment, setNewDepartment] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [newBusinessJustification, setNewBusinessJustification] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false); // For the new department dialog

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
    const loadDepartments = async () => {
      const fetchedDepartments = await departmentService.fetchDepartments();
      setDepartments(fetchedDepartments);
    };
    loadDepartments();
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

  const handleUpdateUser = async (userData: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          user_status: userData.userStatus,
          department: userData.department,
          job_title: userData.jobTitle,
          phone_number: userData.phoneNumber,
          manager_email: userData.managerEmail,
          company_name: userData.companyName,
          business_justification: userData.businessJustification,
          updated_at: new Date().toISOString()
        })
        .eq('id', userData.id);

      if (error) throw error;

      // Refresh the user list
      await fetchUserProfiles();
      setSelectedUserForEdit(null);

      toast({
        title: "Success",
        description: "User updated successfully!",
      });

    } catch (error: any) {
      console.error('Error updating user:', error);
      throw new Error(error.message || "Failed to update user.");
    }
  };

  const handleCreateUser = async () => {
    setIsCreatingUser(true);
    try {
      // 1. Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('User data not returned after signup.');
      }

      // 2. Insert profile data into public.profiles table
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: newEmail,
        first_name: newFirstName,
        last_name: newLastName,
        role: newRole,
        department: newDepartment,
        job_title: newJobTitle,
        phone_number: newPhoneNumber,
        manager_email: newManagerEmail,
        business_justification: newBusinessJustification,
        user_status: 'active', // Default to active
      });

      if (profileError) {
        // If profile creation fails, attempt to delete the auth user to prevent orphaned users
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(profileError.message);
      }

      toast({
        title: 'User Created',
        description: `New user ${newEmail} created successfully!`,
      });

      // Clear form
      setNewEmail('');
      setNewPassword('');
      setNewFirstName('');
      setNewLastName('');
      setNewRole('LEVEL_1');
      setNewDepartment('');
      setNewJobTitle('');
      setNewPhoneNumber('');
      setNewManagerEmail('');
      setNewBusinessJustification('');

      // Refresh user list
      fetchUserProfiles();

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) {
      toast({
        title: "Error",
        description: "Department name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    setIsCreatingDepartment(true);
    try {
      const newDept = await departmentService.createDepartment(newDepartmentName.trim());
      if (newDept) {
        toast({
          title: "Success",
          description: `Department "${newDept.name}" created.`,
        });
        setNewDepartmentName('');
        setIsDepartmentDialogOpen(false);
        
        // Instead of optimistically adding, re-fetch all departments to ensure sync
        const updatedDepartments = await departmentService.fetchDepartments();
        setDepartments(updatedDepartments);
      } else {
        toast({
          title: "Error",
          description: "Failed to create department. It might already exist.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error creating department:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create department.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDepartment(false);
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
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger value="users" className="text-white data-[state=active]:bg-red-600">
            User Profiles
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-white data-[state=active]:bg-red-600">
            Registration Requests
          </TabsTrigger>
          <TabsTrigger value="permissions" className="text-white data-[state=active]:bg-red-600">
            Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-white data-[state=active]:bg-red-600">
            Security Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="bg-gray-900 border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Create New User
              </CardTitle>
              <CardDescription className="text-gray-400">
                Add a new user to the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-email" className="text-white">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="new-password" className="text-white">Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="********"
                  />
                </div>
                <div>
                  <Label htmlFor="new-first-name" className="text-white">First Name</Label>
                  <Input
                    id="new-first-name"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="new-last-name" className="text-white">Last Name</Label>
                  <Input
                    id="new-last-name"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="new-role" className="text-white">Role</Label>
                  <Select onValueChange={(value: Role) => setNewRole(value)} value={newRole}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="LEVEL_1">Level 1</SelectItem>
                      <SelectItem value="LEVEL_2">Level 2</SelectItem>
                      <SelectItem value="LEVEL_3">Level 3</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="FINANCE">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="new-department" className="text-white">Department</Label>
                  <div className="flex items-center space-x-2">
                    <Select onValueChange={(value: string) => setNewDepartment(value)} value={newDepartment}>
                      <SelectTrigger className="flex-grow bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        {console.log('Departments being rendered:', departments)}
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsDepartmentDialogOpen(true)}
                      className="text-white border-gray-600 hover:bg-gray-700"
                      title="Add New Department"
                    >
                      <span className="text-black">+</span>
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-job-title" className="text-white">Job Title</Label>
                  <Input
                    id="new-job-title"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Software Engineer"
                  />
                </div>
                <div>
                  <Label htmlFor="new-phone-number" className="text-white">Phone Number (Optional)</Label>
                  <Input
                    id="new-phone-number"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="+1 (123) 456-7890"
                  />
                </div>
                <div>
                  <Label htmlFor="new-manager-email" className="text-white">Manager Email (Optional)</Label>
                  <Input
                    id="new-manager-email"
                    type="email"
                    value={newManagerEmail}
                    onChange={(e) => setNewManagerEmail(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="manager@example.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="new-business-justification" className="text-white">Business Justification (Optional)</Label>
                  <Textarea
                    id="new-business-justification"
                    value={newBusinessJustification}
                    onChange={(e) => setNewBusinessJustification(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Reason for needing access..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleCreateUser}
                  disabled={isCreatingUser || !newEmail || !newPassword || !newFirstName || !newLastName || !newDepartment || !newJobTitle}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isCreatingUser ? 'Creating User...' : 'Create User'}
                </Button>
              </div>
            </CardContent>
          </Card>
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
                            <Button
                              onClick={() => setSelectedUserForEdit(profile)}
                              size="sm"
                              variant="outline"
                              className="text-white border-gray-600 hover:bg-gray-700"
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4 text-black" />
                            </Button>
                            
                            {profile.role !== 'ADMIN' && profile.user_status === 'active' && (
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

        <TabsContent value="permissions">
          <PermissionsOverview />
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

      

      {/* User Edit Dialog */}
      <UserEditDialog
        user={selectedUserForEdit ? {
          id: selectedUserForEdit.id,
          email: selectedUserForEdit.email,
          fullName: `${selectedUserForEdit.first_name} ${selectedUserForEdit.last_name}`,
          role: selectedUserForEdit.role,
          department: selectedUserForEdit.department,
          userStatus: selectedUserForEdit.user_status,
          jobTitle: null,
          phoneNumber: null,
          managerEmail: null,
          companyName: null,
          businessJustification: null
        } : null}
        isOpen={!!selectedUserForEdit}
        onClose={() => setSelectedUserForEdit(null)}
        onSave={handleUpdateUser}
        departments={departments} // Add this line
      />

      {/* New Department Dialog */}
      <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="department-name" className="text-white">Department Name</Label>
              <Input
                id="department-name"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="e.g., Engineering, Marketing"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsDepartmentDialogOpen(false)}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDepartment}
                disabled={isCreatingDepartment || !newDepartmentName.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isCreatingDepartment ? 'Creating...' : 'Create Department'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementEnhanced;
