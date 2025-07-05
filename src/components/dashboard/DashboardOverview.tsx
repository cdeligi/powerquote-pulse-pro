
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import QuoteAnalyticsDashboard from "./QuoteAnalyticsDashboard";
import { calculateQuoteAnalytics, QuoteData } from "@/utils/quoteAnalytics";
import { useQuotes } from "@/hooks/useQuotes";

interface DashboardOverviewProps {
  user: User;
}

const DashboardOverview = ({ user }: DashboardOverviewProps) => {
  const { quotes, loading, error } = useQuotes();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-red-500">Failed to load quotes.</p>
      </div>
    );
  }

  const mappedQuotes: QuoteData[] = quotes.map((q) => ({
    id: q.id,
    status: q.status === 'under-review' ? 'draft' : (q.status as QuoteData['status']),
    total: q.discounted_value,
    createdAt: q.created_at,
    margin: q.discounted_margin,
    grossProfit: q.gross_profit
  }));

  const analytics = calculateQuoteAnalytics(mappedQuotes);

  const stats = {
    totalQuotes: quotes.length,
    pendingApproval: quotes.filter(q => q.status === 'pending_approval').length,
    approved: quotes.filter(q => q.status === 'approved').length,
    rejected: quotes.filter(q => q.status === 'rejected').length
  };

  const recentQuotes = quotes.slice(0, 3).map((q) => ({
    id: q.id,
    customer: q.customer_name,
    value: `$${q.discounted_value.toLocaleString()}`,
    status: q.status,
    date: q.created_at.split('T')[0]
  }));

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

      {/* Analytics Dashboard */}
      <QuoteAnalyticsDashboard analytics={analytics} isAdmin={user.role === 'admin'} />

      {/* Quick Stats Grid */}
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
