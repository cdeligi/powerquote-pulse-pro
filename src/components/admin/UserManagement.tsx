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
  Shield, 
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
  Plus,
  UserPlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { withCircuitBreaker } from '@/utils/circuitBreaker';

interface UserManagementProps {
  user: User;
}

interface UserForm {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  jobTitle: string;
  phoneNumber: string;
  companyName: string;
  isTwoFactorEnabled: boolean;
}

const UserManagement = ({ user }: UserManagementProps) => {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<UserRegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<UserRegistrationRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState<UserForm>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
    department: '',
    jobTitle: '',
    phoneNumber: '',
    companyName: '',
    isTwoFactorEnabled: false
  });

  useEffect(() => {
    loadUsers();
    loadPendingRequests();
    loadAuditLogs();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await withCircuitBreaker('users.load', () => 
        supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })
      );

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const { data, error } = await withCircuitBreaker('users.requests', () => 
        supabase
          .from('user_registration_requests')
          .select('*')
          .eq('status', 'pending')
          .or('status.eq.under_review')
          .order('created_at', { ascending: false })
      );

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (err) {
      console.error('Error loading pending requests:', err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data, error } = await withCircuitBreaker('users.audit', () => 
        supabase
          .from('security_audit_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50)
      );

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    }
  };

  const handleCreateUser = async () => {
    try {
      setIsLoading(true);
      const { error } = await withCircuitBreaker('users.create', () => 
        supabase.auth.admin.createUser({
          email: userForm.email,
          password: Math.random().toString(36).substring(2, 15), // Generate temporary password
          user_metadata: {
            first_name: userForm.firstName,
            last_name: userForm.lastName,
            department: userForm.department,
            job_title: userForm.jobTitle,
            phone_number: userForm.phoneNumber,
            company_name: userForm.companyName,
            role: userForm.role,
            is_two_factor_enabled: userForm.isTwoFactorEnabled
          }
        })
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "User created successfully. A temporary password has been generated.",
      });

      setIsCreateUserDialogOpen(false);
      setUserForm({
        email: '',
        firstName: '',
        lastName: '',
        role: 'user',
        department: '',
        jobTitle: '',
        phoneNumber: '',
        companyName: '',
        isTwoFactorEnabled: false
      });
      loadUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async (request: UserRegistrationRequest) => {
    try {
      setIsLoading(true);
      const { error: createUserError } = await withCircuitBreaker('users.approve', () => 
        supabase.auth.admin.createUser({
          email: request.email,
          password: Math.random().toString(36).substring(2, 15),
          user_metadata: {
            first_name: request.firstName,
            last_name: request.lastName,
            department: request.department,
            job_title: request.jobTitle,
            phone_number: request.phoneNumber,
            company_name: request.companyName,
            role: request.requestedRole,
            is_two_factor_enabled: request.twoFactorEnabled
          }
        })
      );

      if (createUserError) throw createUserError;

      // Update request status
      const { error: updateError } = await withCircuitBreaker('users.update', () => 
        supabase
          .from('user_registration_requests')
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id
          })
          .eq('id', request.id)
      );

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "User registration request approved and account created.",
      });

      loadPendingRequests();
    } catch (err) {
      console.error('Error approving request:', err);
      toast({
        title: "Error",
        description: "Failed to approve user registration request.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    try {
      setIsLoading(true);
      const { error } = await withCircuitBreaker('users.reject', () => 
        supabase
          .from('user_registration_requests')
          .update({
            status: 'rejected',
            rejection_reason: rejectionReason,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id
          })
          .eq('id', selectedRequest?.id)
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "User registration request rejected.",
      });

      setIsReviewDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      loadPendingRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast({
        title: "Error",
        description: "Failed to reject user registration request.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage system users and registration requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="requests">Registration Requests</TabsTrigger>
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="users">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateUserDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New User
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>2FA</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{`${user.first_name} ${user.last_name}`}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>{user.company_name}</TableCell>
                        <TableCell>
                          {user.is_two_factor_enabled ? (
                            <Shield className="h-4 w-4 text-green-500" />
                          ) : (
                            <Shield className="h-4 w-4 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell>
                          {user.is_locked ? (
                            <Lock className="h-4 w-4 text-red-500" />
                          ) : (
                            <Unlock className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="requests">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{`${request.firstName} ${request.lastName}`}</TableCell>
                      <TableCell>{request.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.requestedRole}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={request.status === 'pending' ? 'outline' : 'default'}
                          className={request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        >
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsReviewDialogOpen(true);
                              }}
                            >
                              Review
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsReviewDialogOpen(true);
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="audit">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{log.userId}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.severity === 'high' ? 'destructive' :
                            log.severity === 'medium' ? 'warning' :
                            'outline'
                          }
                        >
                          {log.severity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Registration Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Justification</Label>
              <Textarea
                value={selectedRequest?.businessJustification || ''}
                readOnly
                className="resize-none"
              />
            </div>
            {selectedRequest?.status === 'pending' && (
              <div>
                <Label>Rejection Reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              {selectedRequest?.status === 'pending' && (
                <Button
                  variant="destructive"
                  onClick={handleRejectRequest}
                >
                  Reject
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsReviewDialogOpen(false)}
              >
                Cancel
              </Button>
              {selectedRequest?.status === 'pending' && (
                <Button
                  onClick={() => handleApproveRequest(selectedRequest)}
                >
                  Approve
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>First Name</Label>
              <input
                type="text"
                value={userForm.firstName}
                onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <input
                type="text"
                value={userForm.lastName}
                onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <Label>Email</Label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="level1">Level 1</option>
                <option value="level2">Level 2</option>
              </select>
            </div>
            <div>
              <Label>Department</Label>
              <input
                type="text"
                value={userForm.department}
                onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <Label>Job Title</Label>
              <input
                type="text"
                value={userForm.jobTitle}
                onChange={(e) => setUserForm({ ...userForm, jobTitle: e.target.value })}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <input
                type="tel"
                value={userForm.phoneNumber}
                onChange={(e) => setUserForm({ ...userForm, phoneNumber: e.target.value })}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <Label>Company Name</Label>
              <input
                type="text"
                value={userForm.companyName}
                onChange={(e) => setUserForm({ ...userForm, companyName: e.target.value })}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={userForm.isTwoFactorEnabled}
                onChange={(e) => setUserForm({ ...userForm, isTwoFactorEnabled: e.target.checked })}
              />
              <Label>Enable Two-Factor Authentication</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateUserDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
              >
                Create User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
