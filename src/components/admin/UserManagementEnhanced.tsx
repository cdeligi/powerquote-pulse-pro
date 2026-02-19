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
  Edit,
  Eye,
  EyeOff,
  Pencil,
  Check,
  X
} from "lucide-react";
import { getSupabaseClient } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();
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
  job_title?: string | null;
  phone_number?: string | null;
  manager_email?: string | null;
  company_name?: string | null;
  business_justification?: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string | null;
  lastSignInAt?: string | null;
}

interface UserManagementEnhancedProps {
  user: User;
}

const DEPARTMENT_FALLBACK: Department[] = [
  { id: 'application-engineer', name: 'Application engineer', created_at: '' },
  { id: 'quote-enginner', name: 'Quote Enginner', created_at: '' },
  { id: 'ae-management', name: 'AE Management', created_at: '' },
  { id: 'sales-engineer', name: 'Sales Engineer', created_at: '' },
  { id: 'sales-director', name: 'Sales Director', created_at: '' },
  { id: 'technical-application-engineer', name: 'Technical Application Engineer', created_at: '' },
  { id: 'field-service-engineer', name: 'Field Service Engineer', created_at: '' },
  { id: 'fse-management', name: 'FSE Management', created_at: '' },
  { id: 'finance', name: 'Finance', created_at: '' },
  { id: 'partner', name: 'Partner', created_at: '' },
];

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
  const [newRole, setNewRole] = useState<string>('level2'); // Default role
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
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState('');
  const [isUpdatingDepartment, setIsUpdatingDepartment] = useState(false);
  const [isDeletingDepartment, setIsDeletingDepartment] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);

  const [pendingRequests, setPendingRequests] = useState<UserRegistrationRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);

  // Fetch user profiles
  const fetchUserProfiles = async () => {
    setLoading(true);
    try {
      // Prefer edge function list (admin scope), fallback to direct query.
      const fnResult = await supabase.functions.invoke('admin-users', { method: 'GET' });
      if (!fnResult.error && (fnResult.data as any)?.users) {
        const normalized = ((fnResult.data as any).users || []).map((u: any) => ({
          id: u.id,
          email: u.email,
          first_name: u.first_name ?? (u.fullName ? String(u.fullName).split(' ')[0] : ''),
          last_name: u.last_name ?? (u.fullName ? String(u.fullName).split(' ').slice(1).join(' ') : ''),
          role: u.role,
          department: u.department ?? '',
          user_status: u.userStatus ?? u.user_status ?? 'active',
          job_title: u.jobTitle ?? u.job_title ?? null,
          phone_number: u.phoneNumber ?? u.phone_number ?? null,
          manager_email: u.managerEmail ?? u.manager_email ?? null,
          company_name: u.companyName ?? u.company_name ?? null,
          business_justification: u.businessJustification ?? u.business_justification ?? null,
          created_at: u.createdAt ?? u.created_at ?? new Date().toISOString(),
          updated_at: u.updatedAt ?? u.updated_at ?? new Date().toISOString(),
          last_sign_in_at: u.lastSignInAt ?? u.last_sign_in_at ?? null,
          lastSignInAt: u.lastSignInAt ?? u.last_sign_in_at ?? null,
        }));
        setUserProfiles(normalized);
        return;
      }

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

  const mapRequestRow = (row: any): UserRegistrationRequest => ({
    id: row.id,
    email: row.email ?? '',
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    department: row.department ?? '',
    jobTitle: row.job_title ?? '',
    phoneNumber: row.phone_number ?? '',
    businessJustification: row.business_justification ?? '',
    requestedRole: (row.requested_role ?? 'level1') as any,
    managerEmail: row.manager_email ?? '',
    companyName: row.company_name ?? '',
    status: (row.status ?? 'pending') as any,
    createdAt: row.requested_at ?? row.created_at ?? new Date().toISOString(),
    reviewedAt: row.processed_at ?? undefined,
    reviewedBy: row.processed_by ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    ipAddress: row.ip_address ?? '',
    userAgent: row.user_agent ?? '',
    loginAttempts: row.login_attempts ?? 0,
    isLocked: row.is_locked ?? false,
    twoFactorEnabled: row.two_factor_enabled ?? false,
    agreedToTerms: row.agreed_to_terms ?? false,
    agreedToPrivacyPolicy: row.agreed_to_privacy_policy ?? false,
  });

  const fetchPendingRequests = async () => {
    try {
      const fnResult = await supabase.functions.invoke('admin-users/user-requests', { method: 'GET' });
      if (!fnResult.error && (fnResult.data as any)?.requests) {
        setPendingRequests(((fnResult.data as any).requests || []).map(mapRequestRow));
        return;
      }

      const { data, error } = await supabase
        .from('user_requests')
        .select('*')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      setPendingRequests((data || []).map(mapRequestRow));
    } catch (error) {
      console.error('Error fetching registration requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch registration requests.',
        variant: 'destructive',
      });
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const fnResult = await supabase.functions.invoke('admin-users/audit-logs', { method: 'GET' });
      if (fnResult.error) throw fnResult.error;

      const sessions = ((fnResult.data as any)?.sessions || []) as any[];
      const mapped: SecurityAuditLog[] = sessions.map((s) => ({
        id: s.id,
        userId: s.user_id || 'unknown',
        action: s.event || 'Unknown Event',
        details: s.user_agent || 'No details provided',
        ipAddress: s.ip_address || 'Unknown',
        userAgent: s.user_agent || '',
        timestamp: s.created_at,
        severity: /fail|reject|error|denied|blocked/i.test(String(s.event || '')) ? 'high' : 'low',
      }));

      setAuditLogs(mapped);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch security audit logs.',
        variant: 'destructive',
      });
      setAuditLogs([]);
    }
  };


  useEffect(() => {
    fetchUserProfiles();
    fetchPendingRequests();
    fetchAuditLogs();
    const loadDepartments = async () => {
      const fetchedDepartments = await departmentService.fetchDepartments();
      setDepartments((fetchedDepartments && fetchedDepartments.length > 0) ? fetchedDepartments : DEPARTMENT_FALLBACK);
    };
    loadDepartments();
  }, []);

  const normalizeRole = (value?: string | null) => String(value || '').trim().toLowerCase();

  const getRoleRank = (value?: string | null) => {
    const role = normalizeRole(value);
    if (role === 'master') return 60;
    if (role === 'admin' || role === 'finance') return 50;
    if (role === 'level3' || role === 'level_3') return 40;
    if (role === 'level2' || role === 'sales') return 30;
    if (role === 'level1') return 20;
    return 10;
  };

  const canCurrentUserDelete = (target: UserProfile) => {
    if (target.user_status !== 'active') return false;

    const currentEmail = String(user?.email || '').toLowerCase();
    const targetEmail = String(target.email || '').toLowerCase();
    if (!currentEmail || currentEmail === targetEmail) return false;

    // Explicit owner override requested.
    if (currentEmail === 'cdeligi@qualitrolcorp.com') return true;

    // Resolve current role from loaded profile list (more reliable than auth payload prop).
    const currentProfile = userProfiles.find((p) => String(p.email || '').toLowerCase() === currentEmail);
    const currentRank = getRoleRank(currentProfile?.role ?? (user as any)?.role);
    const targetRank = getRoleRank(target.role);

    // Higher role can delete downstream users only.
    return currentRank > targetRank;
  };

  const handleRemoveUser = async (userProfile: UserProfile) => {
    try {
      if (!canCurrentUserDelete(userProfile)) {
        throw new Error('You can only remove downstream users.');
      }

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          firstName: newFirstName,
          lastName: newLastName,
          role: newRole,
          department: newDepartment,
          jobTitle: newJobTitle,
          phoneNumber: newPhoneNumber,
          managerEmail: newManagerEmail,
          businessJustification: newBusinessJustification,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Create user failed (${response.status})`);
      }
      if (!(data as any)?.success) {
        throw new Error((data as any)?.error || 'Failed to create user.');
      }

      toast({
        title: 'User Created',
        description: (data as any)?.message || `New user ${newEmail} created successfully!`,
      });

      // Clear form
      setNewEmail('');
      setNewPassword('');
      setNewFirstName('');
      setNewLastName('');
      setNewRole('level2');
      setNewDepartment('');
      setNewJobTitle('');
      setNewPhoneNumber('');
      setNewManagerEmail('');
      setNewBusinessJustification('');

      // Refresh user list
      await fetchUserProfiles();
    } catch (error: any) {
      console.error('Error creating user:', error);
      const details =
        error?.context?.error ||
        error?.context?.message ||
        error?.message ||
        'Failed to create user.';
      toast({
        title: 'Error',
        description: details,
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

  const handleStartEditDepartment = (dept: Department) => {
    setEditingDepartmentId(dept.id);
    setEditingDepartmentName(dept.name);
  };

  const handleCancelEditDepartment = () => {
    setEditingDepartmentId(null);
    setEditingDepartmentName('');
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartmentId || !editingDepartmentName.trim()) return;

    setIsUpdatingDepartment(true);
    try {
      const updated = await departmentService.updateDepartment(editingDepartmentId, editingDepartmentName.trim());
      if (!updated) throw new Error('Failed to update department');

      const updatedDepartments = await departmentService.fetchDepartments();
      setDepartments(updatedDepartments);
      setNewDepartment((prev) => (prev === updated.name ? updated.name : prev));
      toast({ title: 'Success', description: 'Department updated successfully.' });
      handleCancelEditDepartment();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to update department.', variant: 'destructive' });
    } finally {
      setIsUpdatingDepartment(false);
    }
  };

  const handleDeleteDepartment = async (dept: Department) => {
    if (!confirm(`Delete department "${dept.name}"?`)) return;

    setIsDeletingDepartment(true);
    try {
      const ok = await departmentService.deleteDepartment(dept.id);
      if (!ok) throw new Error('Failed to delete department');

      const updatedDepartments = await departmentService.fetchDepartments();
      setDepartments(updatedDepartments);
      if (newDepartment === dept.name) setNewDepartment('');
      toast({ title: 'Success', description: 'Department deleted successfully.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to delete department.', variant: 'destructive' });
    } finally {
      setIsDeletingDepartment(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const result = await supabase.functions.invoke('admin-users/approve-request', {
        method: 'POST',
        body: { requestId },
      });

      if (result.error) throw result.error;

      toast({
        title: 'Success',
        description: 'Request approved. Invite email sent so user can create their password.',
      });

      await fetchPendingRequests();
      await fetchUserProfiles();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request.',
        variant: 'destructive',
      });
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    try {
      const result = await supabase.functions.invoke('admin-users/reject-request', {
        method: 'PUT',
        body: { requestId: selectedRequest.id, reason: rejectionReason.trim() },
      });
      if (result.error) throw result.error;

      toast({
        title: 'Success',
        description: 'Request rejected successfully.',
      });

      setIsReviewDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      await fetchPendingRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request.',
        variant: 'destructive',
      });
    }
  };

  const handleHardDeleteRejectedRequest = async (requestId: string, email: string) => {
    const confirmDelete = window.confirm(
      `This will permanently delete auth user, profile, and request for ${email}.\n\nType-safe dialog will be added next, but do you want to proceed now?`,
    );
    if (!confirmDelete) return;

    try {
      const result = await supabase.functions.invoke('admin-users/delete-rejected-request', {
        method: 'POST',
        body: { requestId },
      });
      if (result.error) throw result.error;

      toast({
        title: 'Success',
        description: 'Rejected user was permanently deleted.',
      });

      await fetchPendingRequests();
      await fetchUserProfiles();
    } catch (error: any) {
      console.error('Error hard deleting rejected request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to hard delete rejected user.',
        variant: 'destructive',
      });
    }
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
            onClick={() => {
              fetchUserProfiles();
              fetchPendingRequests();
              fetchAuditLogs();
            }}
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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-gray-800 h-auto gap-1">
          <TabsTrigger value="users" className="text-white data-[state=active]:bg-red-600 text-xs md:text-sm">
            User Profiles
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-white data-[state=active]:bg-red-600 text-xs md:text-sm">
            Registration Requests
          </TabsTrigger>
          <TabsTrigger value="permissions" className="text-white data-[state=active]:bg-red-600 text-xs md:text-sm">
            Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-white data-[state=active]:bg-red-600 text-xs md:text-sm">
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
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewUserPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white pr-10"
                      placeholder="********"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-300 hover:text-white"
                      onClick={() => setShowNewUserPassword((v) => !v)}
                      title={showNewUserPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
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
                  <Select onValueChange={(value: string) => setNewRole(value)} value={newRole}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem className="text-white focus:text-white" value="level1">level1</SelectItem>
                      <SelectItem className="text-white focus:text-white" value="level2">level2</SelectItem>
                      <SelectItem className="text-white focus:text-white" value="level3">level3</SelectItem>
                      <SelectItem className="text-white focus:text-white" value="admin">admin</SelectItem>
                      <SelectItem className="text-white focus:text-white" value="finance">finance</SelectItem>
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
                         {(departments.length ? departments : DEPARTMENT_FALLBACK).map((dept) => (
                          <SelectItem className="text-white focus:text-white" key={dept.id} value={dept.name}>
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
                      <span className="text-white">+</span>
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
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-800"
                  onClick={() => {
                    setNewEmail('');
                    setNewPassword('');
                    setNewFirstName('');
                    setNewLastName('');
                    setNewRole('level2');
                    setNewDepartment('');
                    setNewJobTitle('');
                    setNewPhoneNumber('');
                    setNewManagerEmail('');
                    setNewBusinessJustification('');
                  }}
                  disabled={isCreatingUser}
                >
                  Clear
                </Button>
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
                User Profiles ({userProfiles.filter(u => u.user_status === 'active').length})
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
                      <TableHead className="text-gray-300 hidden md:table-cell">Department</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300 hidden lg:table-cell">Last Login</TableHead>
                      <TableHead className="text-gray-300 hidden md:table-cell">Created</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userProfiles.filter((p) => p.user_status === 'active').map((profile) => (
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
                        <TableCell className="text-gray-300 hidden md:table-cell">
                          {profile.department || '-'}
                        </TableCell>
                        <TableCell>
                          {getUserStatusBadge(profile.user_status)}
                        </TableCell>
                        <TableCell className="text-gray-300 text-xs hidden lg:table-cell">
                          {profile.last_sign_in_at || profile.lastSignInAt
                            ? new Date((profile.last_sign_in_at || profile.lastSignInAt) as string).toLocaleString()
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-gray-300 hidden md:table-cell">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </TableCell>
                         <TableCell>
            <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => setSelectedUserForEdit(profile)}
                              size="sm"
                              variant="outline"
                              className="text-white border-gray-600 hover:bg-gray-700"
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4 text-black" />
                            </Button>
                            
                            {canCurrentUserDelete(profile) && (
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
                    <TableHead className="text-gray-300 hidden md:table-cell">Company</TableHead>
                    <TableHead className="text-gray-300">Role</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300 hidden md:table-cell">Submitted</TableHead>
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
                      <TableCell className="text-gray-300 hidden md:table-cell">
                        {request.companyName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-blue-400 border-blue-400">
                          {request.requestedRole}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell className="text-gray-300 hidden md:table-cell">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <p className="text-white">{request.requestedRole}</p>
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

                          {request.status === 'rejected' && (
                            <Button
                              onClick={() => handleHardDeleteRejectedRequest(request.id, request.email)}
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white"
                              title="Permanently delete rejected user"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
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
          jobTitle: selectedUserForEdit.job_title ?? null,
          phoneNumber: selectedUserForEdit.phone_number ?? null,
          managerEmail: selectedUserForEdit.manager_email ?? null,
          companyName: selectedUserForEdit.company_name ?? null,
          businessJustification: selectedUserForEdit.business_justification ?? null,
          lastLoginAt: selectedUserForEdit.last_sign_in_at ?? selectedUserForEdit.lastSignInAt ?? null
        } : null}
        isOpen={!!selectedUserForEdit}
        onClose={() => setSelectedUserForEdit(null)}
        onSave={handleUpdateUser}
        departments={departments.length ? departments : [{id:'application-engineer',name:'Application engineer'},{id:'quote-enginner',name:'Quote Enginner'},{id:'ae-management',name:'AE Management'},{id:'sales-engineer',name:'Sales Engineer'},{id:'sales-director',name:'Sales Director'},{id:'technical-application-engineer',name:'Technical Application Engineer'},{id:'field-service-engineer',name:'Field Service Engineer'},{id:'fse-management',name:'FSE Management'},{id:'finance',name:'Finance'},{id:'partner',name:'Partner'}]}
        currentUserEmail={user?.email ?? null}
      />

      {/* Department Management Dialog */}
      <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Departments</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label htmlFor="department-name" className="text-white">Add Department</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="department-name"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., Engineering, Marketing"
                />
                <Button
                  onClick={handleCreateDepartment}
                  disabled={isCreatingDepartment || !newDepartmentName.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isCreatingDepartment ? 'Creating...' : 'Add'}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-white">Existing Departments</Label>
              <div className="mt-2 max-h-72 overflow-y-auto space-y-2 pr-1">
                {(departments.length ? departments : DEPARTMENT_FALLBACK).map((dept) => (
                  <div key={dept.id} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded p-2">
                    {editingDepartmentId === dept.id ? (
                      <>
                        <Input
                          value={editingDepartmentName}
                          onChange={(e) => setEditingDepartmentName(e.target.value)}
                          className="bg-gray-900 border-gray-600 text-white"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-green-600 text-green-400"
                          onClick={handleUpdateDepartment}
                          disabled={isUpdatingDepartment || !editingDepartmentName.trim()}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="border-gray-600 text-white" onClick={handleCancelEditDepartment}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 text-white">{dept.name}</div>
                        <Button size="icon" variant="outline" className="border-gray-600 text-white" onClick={() => handleStartEditDepartment(dept)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleDeleteDepartment(dept)}
                          disabled={isDeletingDepartment}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDepartmentDialogOpen(false)}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementEnhanced;
