
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUserSessions } from '@/hooks/useUserSessions';
import { useToast } from '@/hooks/use-toast';
import { Activity, MapPin, Monitor, Clock, ShieldOff } from 'lucide-react';

const UserActivityMonitor = () => {
  const { sessions, loading, revokeUserAccess } = useUserSessions();
  const [revokeReason, setRevokeReason] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRevokeAccess = async () => {
    if (!selectedUserId || !revokeReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for revoking access",
        variant: "destructive"
      });
      return;
    }

    await revokeUserAccess(selectedUserId, revokeReason);
    setRevokeReason('');
    setSelectedUserId(null);
  };

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Monitor className="h-4 w-4" />;
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return <Monitor className="h-4 w-4" />; // Mobile icon would be better
    }
    return <Monitor className="h-4 w-4" />;
  };

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Active now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="text-white">Loading user activity...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Activity className="mr-2 h-5 w-5" />
          User Activity Monitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              No user sessions found
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        {getDeviceIcon(session.user_agent)}
                        <span className="text-white font-medium">
                          User: {session.user_id.substring(0, 8)}...
                        </span>
                      </div>
                      <Badge className={`${
                        session.is_active ? 'bg-green-600' : 'bg-red-600'
                      } text-white`}>
                        {session.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {session.revoked_at && (
                        <Badge className="bg-red-800 text-white">
                          Revoked
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{session.ip_address || 'Unknown IP'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatLastActivity(session.last_activity)}</span>
                      </div>
                      <div className="text-xs">
                        Created: {new Date(session.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {session.user_agent && (
                      <div className="mt-2 text-xs text-gray-500 truncate">
                        {session.user_agent}
                      </div>
                    )}
                  </div>

                  {session.is_active && !session.revoked_at && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => setSelectedUserId(session.user_id)}
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white ml-4"
                        >
                          <ShieldOff className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-gray-800">
                        <DialogHeader>
                          <DialogTitle className="text-white">Revoke User Access</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3">
                            <p className="text-red-400 text-sm">
                              This will immediately terminate all active sessions for this user
                              and prevent them from accessing the system.
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="revoke-reason" className="text-white">
                              Reason for revocation *
                            </Label>
                            <Textarea
                              id="revoke-reason"
                              value={revokeReason}
                              onChange={(e) => setRevokeReason(e.target.value)}
                              placeholder="Explain why access is being revoked..."
                              className="bg-gray-800 border-gray-700 text-white mt-1"
                              required
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleRevokeAccess}
                              className="bg-red-600 hover:bg-red-700 text-white"
                              disabled={!revokeReason.trim()}
                            >
                              Confirm Revocation
                            </Button>
                            <Button
                              onClick={() => {
                                setRevokeReason('');
                                setSelectedUserId(null);
                              }}
                              variant="outline"
                              className="border-gray-600 text-gray-300 hover:bg-gray-800"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserActivityMonitor;
