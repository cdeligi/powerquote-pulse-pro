
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Eye, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();

interface UserRequest {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  requested_role: string;
  department: string | null;
  job_title: string | null;
  phone_number: string | null;
  manager_email: string | null;
  company_name: string | null;
  business_justification: string | null;
  requested_at: string;
  status: string;
  processed_by: string | null;
  processed_at: string | null;
  rejection_reason: string | null;
  processed_by_profile: {
    first_name: string;
    last_name: string;
  } | null;
}

export default function UserRequestsTab() {
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch directly from user_requests table
      const { data: requestsData, error } = await supabase
        .from('user_requests')
        .select(`
          *,
          processed_by_profile:profiles!user_requests_processed_by_fkey(first_name, last_name)
        `)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error fetching user requests:', error);
        throw error;
      }
      
      console.log('Fetched user requests:', requestsData);
      setRequests(requestsData || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch user requests.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/approve-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve request');
      }

      const result = await response.json();
      
      toast({
        title: "Request Approved",
        description: `User created successfully! Temporary password: ${result.tempPassword}`,
      });

      await fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve request.",
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    try {
      setProcessingRequest(selectedRequest.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/reject-request`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          requestId: selectedRequest.id,
          reason: rejectionReason 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject request');
      }

      toast({
        title: "Request Rejected",
        description: "User request has been rejected successfully.",
      });

      setIsRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      await fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject request.",
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleHardDeleteRejected = async () => {
    if (!selectedRequest) return;

    try {
      setProcessingRequest(selectedRequest.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/delete-rejected-request`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId: selectedRequest.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to hard delete rejected user');
      }

      toast({
        title: 'Rejected user deleted',
        description: 'Auth user, profile, and request record were permanently deleted.',
      });

      setIsDeleteDialogOpen(false);
      setSelectedRequest(null);
      setDeleteConfirmText('');
      await fetchRequests();
    } catch (error: any) {
      console.error('Error hard deleting rejected request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to hard delete rejected user.',
        variant: 'destructive',
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-600',
      approved: 'bg-green-600',
      rejected: 'bg-red-600'
    };
    
    return (
      <Badge className={`${colors[status as keyof typeof colors] || 'bg-gray-600'} text-white`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-white text-center py-8">Loading user requests...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">User Requests ({requests.length})</h3>
        <Button onClick={fetchRequests} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-gray-800">
            <TableHead className="text-gray-300">User</TableHead>
            <TableHead className="text-gray-300">Email</TableHead>
            <TableHead className="text-gray-300">Role</TableHead>
            <TableHead className="text-gray-300">Company</TableHead>
            <TableHead className="text-gray-300">Status</TableHead>
            <TableHead className="text-gray-300">Requested</TableHead>
            <TableHead className="text-gray-300">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id} className="border-gray-800">
              <TableCell>
                <div>
                  <p className="font-medium text-white">
                    {request.first_name} {request.last_name}
                  </p>
                  {request.job_title && (
                    <p className="text-sm text-gray-400">{request.job_title}</p>
                  )}
                  {request.department && (
                    <p className="text-sm text-gray-400">{request.department}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-gray-300">{request.email}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  {request.requested_role}
                </Badge>
              </TableCell>
              <TableCell className="text-gray-300">{request.company_name || 'N/A'}</TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell className="text-gray-300">
                {new Date(request.requested_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => {
                      setSelectedRequest(request);
                      setIsDetailDialogOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="text-white border-gray-600"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {request.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingRequest === request.id}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsRejectDialogOpen(true);
                        }}
                        disabled={processingRequest === request.id}
                        size="sm"
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {request.status === 'rejected' && (
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setDeleteConfirmText('');
                        setIsDeleteDialogOpen(true);
                      }}
                      disabled={processingRequest === request.id}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                      title="Hard delete rejected user"
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

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">User Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Name</Label>
                  <p className="text-white">{selectedRequest.first_name} {selectedRequest.last_name}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Email</Label>
                  <p className="text-white">{selectedRequest.email}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Requested Role</Label>
                  <p className="text-white">{selectedRequest.requested_role}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Department</Label>
                  <p className="text-white">{selectedRequest.department || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Job Title</Label>
                  <p className="text-white">{selectedRequest.job_title || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Phone Number</Label>
                  <p className="text-white">{selectedRequest.phone_number || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Manager Email</Label>
                  <p className="text-white">{selectedRequest.manager_email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Company Name</Label>
                  <p className="text-white">{selectedRequest.company_name || 'N/A'}</p>
                </div>
              </div>
              
              {selectedRequest.business_justification && (
                <div>
                  <Label className="text-gray-400">Business Justification</Label>
                  <p className="text-white bg-gray-800 p-3 rounded mt-1">
                    {selectedRequest.business_justification}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-400">Status</Label>
                  <p className="text-white">{getStatusBadge(selectedRequest.status)}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Requested At</Label>
                  <p className="text-white">
                    {new Date(selectedRequest.requested_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {selectedRequest.processed_at && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-400">Processed By</Label>
                    <p className="text-white">
                      {selectedRequest.processed_by_profile ? 
                        `${selectedRequest.processed_by_profile.first_name} ${selectedRequest.processed_by_profile.last_name}` :
                        'System'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Processed At</Label>
                    <p className="text-white">
                      {new Date(selectedRequest.processed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              {selectedRequest.rejection_reason && (
                <div>
                  <Label className="text-gray-400">Rejection Reason</Label>
                  <p className="text-white bg-gray-800 p-3 rounded mt-1">
                    {selectedRequest.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Reject User Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                onClick={() => setIsRejectDialogOpen(false)}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingRequest === selectedRequest?.id}
                variant="destructive"
              >
                {processingRequest === selectedRequest?.id ? 'Rejecting...' : 'Reject Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hard Delete Rejected Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Hard Delete Rejected User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              This will permanently delete the auth user, profile, and request record for:
              <span className="font-semibold text-white"> {selectedRequest?.email}</span>
            </p>
            <p className="text-sm text-red-400">This action cannot be undone.</p>

            <div>
              <Label htmlFor="delete-confirm" className="text-white">
                Type <span className="font-mono">DELETE</span> to confirm
              </Label>
              <Textarea
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white mt-2"
                placeholder="DELETE"
                rows={1}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeleteConfirmText('');
                }}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleHardDeleteRejected}
                disabled={deleteConfirmText.trim() !== 'DELETE' || processingRequest === selectedRequest?.id}
                variant="destructive"
              >
                {processingRequest === selectedRequest?.id ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
