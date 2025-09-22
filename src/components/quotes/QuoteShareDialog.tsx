import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Share, Users, Eye, Edit } from 'lucide-react';
import { useQuoteSharing } from '@/hooks/useQuoteSharing';
import { useEffect } from 'react';

interface QuoteShareDialogProps {
  quoteId: string;
  quoteName: string;
  children?: React.ReactNode;
}

export const QuoteShareDialog = ({ quoteId, quoteName, children }: QuoteShareDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('view');
  
  const {
    shares,
    users,
    loading,
    fetchQuoteShares,
    shareQuote,
    unshareQuote,
    updateSharePermission
  } = useQuoteSharing();

  useEffect(() => {
    if (open) {
      fetchQuoteShares(quoteId);
    }
  }, [open, quoteId]);

  const handleShare = async () => {
    if (!selectedUserId) return;
    
    await shareQuote(quoteId, selectedUserId, selectedPermission);
    setSelectedUserId('');
    setSelectedPermission('view');
  };

  const handleUnshare = async (shareId: string) => {
    await unshareQuote(shareId, quoteId);
  };

  const handlePermissionChange = async (shareId: string, newPermission: 'view' | 'edit') => {
    await updateSharePermission(shareId, quoteId, newPermission);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
            title="Share Quote"
          >
            <Share className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Quote: {quoteName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Share */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Add Collaborator</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-white hover:bg-gray-700">
                      {user.email} ({user.first_name} {user.last_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPermission} onValueChange={(value: 'view' | 'edit') => setSelectedPermission(value)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="view" className="text-white hover:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View Only
                    </div>
                  </SelectItem>
                  <SelectItem value="edit" className="text-white hover:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Can Edit
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleShare}
                disabled={!selectedUserId || loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Share
              </Button>
            </div>
          </div>

          {/* Existing Shares */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Current Collaborators</h3>
            
            {shares.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                This quote is not shared with anyone yet.
              </div>
            ) : (
              <div className="space-y-3">
                {shares.map(share => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-white font-medium">
                          {share.shared_with_name || 'Unknown User'}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {share.shared_with_email}
                        </div>
                        <div className="text-gray-500 text-xs">
                          Shared {new Date(share.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Select
                        value={share.permission_level}
                        onValueChange={(value: 'view' | 'edit') => handlePermissionChange(share.id, value)}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="view" className="text-white hover:bg-gray-600">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              View
                            </div>
                          </SelectItem>
                          <SelectItem value="edit" className="text-white hover:bg-gray-600">
                            <div className="flex items-center gap-2">
                              <Edit className="h-4 w-4" />
                              Edit
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {share.expires_at && (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                          Expires {new Date(share.expires_at).toLocaleDateString()}
                        </Badge>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnshare(share.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        title="Remove access"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
