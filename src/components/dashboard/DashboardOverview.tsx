
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface DashboardOverviewProps {
  user: User;
}

const DashboardOverview = ({ user }: DashboardOverviewProps) => {
  // Mock data for demonstration
  const stats = {
    totalQuotes: 12,
    pendingApproval: 3,
    approved: 8,
    rejected: 1
  };

  const recentQuotes = [
    {
      id: 'Q-2024-001',
      customer: 'ABC Power Company',
      value: '$45,250',
      status: 'pending_approval',
      date: '2024-01-15'
    },
    {
      id: 'Q-2024-002',
      customer: 'Delta Electric',
      value: '$78,900',
      status: 'approved',
      date: '2024-01-14'
    },
    {
      id: 'Q-2024-003',
      customer: 'Phoenix Utilities',
      value: '$32,100',
      status: 'draft',
      date: '2024-01-13'
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-600', text: 'Draft' },
      pending_approval: { color: 'bg-yellow-600', text: 'Pending' },
      approved: { color: 'bg-green-600', text: 'Approved' },
      rejected: { color: 'bg-red-600', text: 'Rejected' }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user.name}
        </h1>
        <p className="text-gray-400">
          Here's an overview of your quoting activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Quotes
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalQuotes}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Pending Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.pendingApproval}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Approved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Rejected
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotes */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Quotes</CardTitle>
          <CardDescription className="text-gray-400">
            Your latest quoting activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentQuotes.map((quote) => {
              const statusBadge = getStatusBadge(quote.status);
              return (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-white font-medium">{quote.id}</span>
                      <Badge className={`${statusBadge.color} text-white`}>
                        {statusBadge.text}
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{quote.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">
                      {user.role === 'level1' ? '—' : quote.value}
                    </p>
                    <p className="text-gray-400 text-sm">{quote.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
