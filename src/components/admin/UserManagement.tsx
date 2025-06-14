
import { useState } from "react";
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
  Activity
} from "lucide-react";

interface UserManagementProps {
  user: User;
}

const UserManagement = ({ user }: UserManagementProps) => {
  const [selectedRequest, setSelectedRequest] = useState<UserRegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Mock data - in real app this would come from API
  const [pendingRequests, setPendingRequests] = useState<UserRegistrationRequest[]>([
    {
      id: 'REG-2024-001',
      email: 'john.smith@acmepower.com',
      firstName: 'John',
      lastName: 'Smith',
      department: 'sales',
      jobTitle: 'Senior Sales Engineer',
      phoneNumber: '+1 (555) 123-4567',
      businessJustification: 'I need access to the PowerQuotePro system to generate quotes for our utility customers. My role involves creating technical proposals and pricing for transformer monitoring solutions.',
      requestedRole: 'level2',
      managerEmail: 'manager@acmepower.com',
      companyName: 'ACME Power Solutions',
      status: 'pending',
      createdAt: '2024-01-16T10:30:00Z',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      loginAttempts: 0,
      isLocked: false,
      twoFactorEnabled: false,
      agreedToTerms: true,
      agreedToPrivacyPolicy: true
    },
    {
      id: 'REG-2024-002',
      email: 'sarah.jones@gridtech.com',
      firstName: 'Sarah',
      lastName: 'Jones',
      department: 'engineering',
      jobTitle: 'Application Engineer',
      phoneNumber: '+1 (555) 987-6543',
      businessJustification: 'As an application engineer, I require access to create detailed technical quotes and BOMs for our transformer monitoring projects. This access is essential for my daily responsibilities.',
      requestedRole: 'level1',
      managerEmail: 'eng.manager@gridtech.com',
      companyName: 'GridTech Engineering',
      status: 'under_review',
      createdAt: '2024-01-15T14:15:00Z',
      reviewedAt: '2024-01-16T09:00:00Z',
      reviewedBy: user.id,
      ipAddress: '10.0.1.50',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
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
    },
    {
      id: 'AUDIT-002',
      action: 'Admin Login',
      details: 'Administrator accessed user management panel',
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      timestamp: '2024-01-16T09:00:00Z',
      severity: 'medium'
    },
    {
      id: 'AUDIT-003',
      userId: 'REG-2024-002',
      action: 'Request Status Changed',
      details: 'Registration request moved to under review',
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      timestamp: '2024-01-16T09:05:00Z',
      severity: 'low'
    }
  ];

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
    // In real app, would create user account and send welcome email
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
    console.log(`Rejected registration request: ${selectedRequest.id}`);
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
          <p className="text-gray-400">Manage user registration requests and security auditing</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-400">Pending Requests</p>
            <p className="text-2xl font-bold text-yellow-500">
              {pendingRequests.filter(r => r.status === 'pending').length}
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
                <p className="text-sm text-gray-400">Under Review</p>
                <p className="text-2xl font-bold text-blue-500">
                  {pendingRequests.filter(r => r.status === 'under_review').length}
                </p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Approved</p>
                <p className="text-2xl font-bold text-green-500">
                  {pendingRequests.filter(r => r.status === 'approved').length}
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
                <p className="text-sm text-gray-400">Rejected</p>
                <p className="text-2xl font-bold text-red-500">
                  {pendingRequests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger value="requests" className="text-white data-[state=active]:bg-red-600">
            Registration Requests
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-white data-[state=active]:bg-red-600">
            Security Audit Log
          </TabsTrigger>
        </TabsList>

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
