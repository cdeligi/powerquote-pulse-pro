
import { useState, useEffect } from "react";
import { User } from "@/types/auth";
import Sidebar from "./Sidebar";
import DashboardOverview from "./DashboardOverview";
import BOMBuilder from "../bom/BOMBuilder";
import QuoteManager from "../quotes/QuoteManager";
import AdminPanel from "../admin/AdminPanel";
import { BOMItem } from "@/types/product";
import { calculateQuoteAnalytics, QuoteAnalytics, QuoteData } from "@/utils/quoteAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type ActiveView = 'overview' | 'bom' | 'quotes' | 'admin';

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [analytics, setAnalytics] = useState<QuoteAnalytics>(calculateQuoteAnalytics([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching analytics data...');
        
        // Try to update analytics first, but don't fail if it errors
        try {
          await supabase.rpc('update_quote_analytics');
        } catch (rpcError) {
          console.warn('Analytics update failed, continuing with existing data:', rpcError);
        }
        
        const { data, error } = await supabase
          .from('quotes')
          .select('id,status,discounted_value,gross_profit,discounted_margin,created_at');
          
        if (error) {
          console.error('Failed to fetch quotes for analytics', error);
          throw error;
        }
        
        const quoteData: QuoteData[] = (data || []).map((q) => ({
          id: q.id,
          status: q.status,
          total: q.discounted_value || 0,
          grossProfit: q.gross_profit || 0,
          margin: q.discounted_margin || 0,
          createdAt: q.created_at,
        }));
        
        console.log(`Processed ${quoteData.length} quotes for analytics`);
        setAnalytics(calculateQuoteAnalytics(quoteData));
      } catch (err) {
        console.error('Failed to load analytics', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
        
        // Show toast but don't block the UI
        toast({
          title: "Warning",
          description: "Analytics data could not be loaded. Using default values.",
          variant: "destructive"
        });
        
        // Set default analytics to prevent crashes
        setAnalytics(calculateQuoteAnalytics([]));
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [toast]);

  const handleBOMUpdate = (items: BOMItem[]) => {
    setBomItems(items);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      );
    }

    if (error && activeView === 'overview') {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-center max-w-md">
            <h3 className="text-xl mb-4">Dashboard Loading Error</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'overview':
        return <DashboardOverview analytics={analytics} isAdmin={user.role === 'admin'} />;
      case 'bom':
        return (
          <BOMBuilder
            onBOMUpdate={handleBOMUpdate}
            canSeePrices={user.role === 'admin'}
          />
        );
      case 'quotes':
        return <QuoteManager user={user} />;
      case 'admin':
        return user.role === 'admin' ? <AdminPanel user={user} /> : <div className="text-white">Access Denied</div>;
      default:
        return <DashboardOverview analytics={analytics} isAdmin={user.role === 'admin'} />;
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar 
        user={user}
        activeView={activeView}
        onViewChange={setActiveView}
        onLogout={onLogout}
      />
      <main className="flex-1 ml-64 p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;
