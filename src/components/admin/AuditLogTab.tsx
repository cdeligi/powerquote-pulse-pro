
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuditSession {
  id: string;
  user_id: string | null;
  event: string;
  ip_address: string | null;
  user_agent: string | null;
  location: any;
  device_info: any;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export default function AuditLogTab() {
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch directly from user_sessions table with profile relationship
      const { data: sessionsData, error } = await supabase
        .from('user_sessions')
        .select(`
          *,
          profiles!user_sessions_user_id_fkey(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching audit logs:', error);
        throw error;
      }
      
      console.log('Fetched audit logs:', sessionsData);
      setSessions(sessionsData || []);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch audit logs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const getEventBadge = (event: string) => {
    const colors = {
      login: 'bg-green-600',
      logout: 'bg-red-600',
      session_refresh: 'bg-blue-600'
    };
    
    return (
      <Badge className={`${colors[event as keyof typeof colors] || 'bg-gray-600'} text-white`}>
        {event.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getBrowserInfo = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  };

  if (loading) {
    return <div className="text-white text-center py-8">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Security Audit Log ({sessions.length})</h3>
        <Button onClick={fetchAuditLogs} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-gray-800">
            <TableHead className="text-gray-300">Timestamp</TableHead>
            <TableHead className="text-gray-300">User</TableHead>
            <TableHead className="text-gray-300">Event</TableHead>
            <TableHead className="text-gray-300">IP Address</TableHead>
            <TableHead className="text-gray-300">Browser</TableHead>
            <TableHead className="text-gray-300">Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id} className="border-gray-800">
              <TableCell className="text-gray-300">
                {new Date(session.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                <div>
                  {session.profiles ? (
                    <>
                      <p className="font-medium text-white">
                        {session.profiles.first_name} {session.profiles.last_name}
                      </p>
                      <p className="text-sm text-gray-400">{session.profiles.email}</p>
                    </>
                  ) : (
                    <p className="text-gray-400">Unknown User</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {getEventBadge(session.event)}
              </TableCell>
              <TableCell className="text-gray-300 font-mono text-sm">
                {session.ip_address || 'Unknown'}
              </TableCell>
              <TableCell className="text-gray-300">
                {getBrowserInfo(session.user_agent)}
              </TableCell>
              <TableCell className="text-gray-300">
                {session.location?.city || session.location?.country || 'Unknown'}
              </TableCell>
            </TableRow>
          ))}
          {sessions.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                No audit logs found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
