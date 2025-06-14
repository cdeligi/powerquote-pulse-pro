
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PendingUser } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Mail,
  Phone,
  Building,
  User as UserIcon
} from "lucide-react";

const UserManagement = () => {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Mock pending user requests
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([
    {
      id: 'REQ-001',
      email: 'john.doe@qualitrol.com',
      firstName: 'John',
      lastName: 'Doe',
      department: 'sales',
      role: 'level1',
      businessJustification: 'I need access to PowerQuotePro to create quotes for my assigned customers in the Northeast region. This will help me respond faster to customer inquiries and improve our sales process.',
      managerName: 'Sarah Johnson',
      managerEmail: 'sarah.johnson@qualitrol.com',
      phoneNumber: '+1 (555) 123-4567',
      requestedAt: '2024-01-16T10:30:00Z',
      status: 'pending'
    },
    {
      id: 'REQ-002',
      email: 'jane.smith@qualitrol.com',
      firstName: 'Jane',
      lastName: 'Smith',
      department: 'engineering',
      role: 'level2',
      businessJustification: 'As a senior engineer, I need Level 2 access to create complex technical quotes for custom transformer monitoring solutions. I work directly with large utility customers on specialized projects.',
      managerName: 'Mike Chen',
      managerEmail: 'mike.chen@qualitrol.com',
      phoneNumber: '+1 (555) 987-6543',
      requestedAt: '2024-01-15T14:20:00Z',
      status: 'pending'
    }
  ]);

  const handleApproveUser = (userId: string) => {
    setPendingUsers(prev => 
      prev.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              status: 'approved' as const,
              approvedBy: 'Jennifer Martinez',
              approvedAt: new Date().toISOString()
            }
          : user
      )
    );
    
    toast({
      title: "User Approved",
      description: "User access has been approved and credentials will be sent via email.",
    });
    
    console.log(`User ${userId} approved - sending welcome email with temporary credentials`);
  };

  const handleRejectUser = (userId: string, reason: string) => {
    setPendingUsers(prev => 
      prev.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              status: 'rejected' as const,
              rejectionReason: reason
            }
          : user
      )
    );
    
    toast({
      title: "User Rejected",
      description: "User access request has been rejected and notification sent.",
      variant: "destructive"
    });
    
    setRejectionReason('');
    console.log(`User ${userId} rejected - reason: ${reason}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-600 text-white"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">User Access Management</h2>
        <p className="text-gray-400">Review and manage user access requests</p>
      </div>

      <div className="grid gap-4">
        {pendingUsers.map((user) => (
          <Card key={user.id} className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white flex items-center">
                    <UserIcon className="mr-2 h-5 w-5" />
                    {user.firstName} {user.lastName}
                  </CardTitle>
                  <CardDescription className="text-gray-400 mt-1">
                    {user.email} • Requested {new Date(user.requestedAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                {getStatusBadge(user.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-300">
                    <Building className="mr-2 h-4 w-4" />
                    Department: {user.department}
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <Phone className="mr-2 h-4 w-4" />
                    {user.phoneNumber}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">
                    Access Level: <span className="text-white">{user.role === 'level1' ? 'Level 1 - Basic' : 'Level 2 - Advanced'}</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Manager: <span className="text-white">{user.managerName}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <Label className="text-gray-300 text-sm">Business Justification:</Label>
                <p className="text-white text-sm bg-gray-800 p-2 rounded mt-1">
                  {user.businessJustification}
                </p>
              </div>

              {user.status === 'pending' && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleApproveUser(user.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Access
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        onClick={() => setSelectedUser(user)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject Request
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-800">
                      <DialogHeader>
                        <DialogTitle className="text-white">Reject Access Request</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-gray-300">
                          Rejecting access request for {selectedUser?.firstName} {selectedUser?.lastName}
                        </p>
                        <div>
                          <Label htmlFor="rejection-reason" className="text-white">Rejection Reason *</Label>
                          <Textarea
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Please provide a reason for rejection..."
                            className="bg-gray-800 border-gray-700 text-white mt-2"
                            rows={3}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => {
                              if (selectedUser && rejectionReason.trim()) {
                                handleRejectUser(selectedUser.id, rejectionReason);
                                setSelectedUser(null);
                              }
                            }}
                            variant="destructive"
                            disabled={!rejectionReason.trim()}
                          >
                            Confirm Rejection
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedUser(null);
                              setRejectionReason('');
                            }}
                            className="text-gray-400 hover:text-white"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    variant="outline"
                    className="border-gray-600 text-white hover:bg-gray-800"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Manager
                  </Button>
                </div>
              )}

              {user.status === 'approved' && (
                <div className="bg-green-900/20 border border-green-700 rounded p-3">
                  <p className="text-green-200 text-sm">
                    Approved by {user.approvedBy} on {user.approvedAt ? new Date(user.approvedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              )}

              {user.status === 'rejected' && user.rejectionReason && (
                <div className="bg-red-900/20 border border-red-700 rounded p-3">
                  <p className="text-red-200 text-sm">
                    <strong>Rejection Reason:</strong> {user.rejectionReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingUsers.length === 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="text-center py-8">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-400">No pending user access requests</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserManagement;
