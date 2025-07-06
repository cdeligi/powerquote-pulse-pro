
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
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // Enhanced analytics fetching with retry logic and timeout
  const fetchAnalytics = async (isRetry = false) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching analytics data... (attempt ${retryCount + 1})`);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analytics fetch timeout')), 10000);
      });

      // Try to update analytics with timeout
      try {
        await Promise.race([
          supabase.rpc('update_quote_analytics'),
          timeoutPromise
        ]);
        console.log('Analytics RPC completed successfully');
      } catch (rpcError) {
        console.warn('Analytics RPC failed or timed out, continuing with existing data:', rpcError);
      }
        
      // Fetch quotes with proper error handling and timeout
      const quotesPromise = supabase
        .from('quotes')
        .select('id,status,discounted_value,gross_profit,discounted_margin,created_at')
        .order('created_at', { ascending: false });
        
      const { data, error: quotesError } = await Promise.race([
        quotesPromise,
        timeoutPromise
      ]) as any;
          
      if (quotesError) {
        console.error('Failed to fetch quotes for analytics:', quotesError);
        throw quotesError;
      }
        
      const quoteData: QuoteData[] = (data || []).map((q) => ({
        id: q.id,
        status: q.status,
        total: q.discounted_value || 0,
        grossProfit: q.gross_profit || 0,
        margin: q.discounted_margin || 0,
        createdAt: q.created_at,
      }));
        
      console.log(`Successfully processed ${quoteData.length} quotes for analytics`);
      const calculatedAnalytics = calculateQuoteAnalytics(quoteData);
      setAnalytics(calculatedAnalytics);
      setRetryCount(0); // Reset retry count on success
      
    } catch (err) {
      console.error('Failed to load analytics:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
      
      // Only show toast on first failure or after retries
      if (!isRetry || retryCount === 0) {
        toast({
          title: "Analytics Loading Issue",
          description: "Using default values. Dashboard functionality remains available.",
          variant: "destructive"
        });
      }
      
      // Set safe default analytics
      setAnalytics(calculateQuoteAnalytics([]));
      
      // Auto-retry with exponential backoff (max 3 attempts)
      if (retryCount < 2) {
        const retryDelay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
        console.log(`Retrying analytics fetch in ${retryDelay}ms...`);
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchAnalytics(true);
        }, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleBOMUpdate = (items: BOMItem[]) => {
    setBomItems(items);
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchAnalytics();
  };

  const renderContent = () => {
    if (loading && retryCount === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading dashboard...</p>
            <p className="text-sm text-gray-400 mt-2">Fetching analytics data</p>
          </div>
        </div>
      );
    }

    if (error && activeView === 'overview' && retryCount >= 2) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-center max-w-md">
            <h3 className="text-xl mb-4">Dashboard Temporarily Unavailable</h3>
            <p className="text-gray-300 mb-4">
              Analytics service is experiencing issues. Core functionality remains available.
            </p>
            <div className="space-y-2">
              <button 
                onClick={handleRetry} 
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Retry Loading Analytics
              </button>
              <button 
                onClick={() => setActiveView('bom')} 
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              >
                Continue to BOM Builder
              </button>
              <button 
                onClick={() => setActiveView('quotes')} 
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              >
                Continue to Quotes
              </button>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Error: {error}
            </div>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'overview':
        return (
          <DashboardOverview 
            analytics={analytics} 
            isAdmin={user.role === 'admin'}
            loading={loading && retryCount > 0}
            onRetry={handleRetry}
          />
        );
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
        return user.role === 'admin' ? <AdminPanel user={user} /> : (
          <div className="text-white text-center py-8">
            <h2 className="text-xl mb-4">Access Denied</h2>
            <p className="text-gray-400">You don't have permission to access the admin panel.</p>
          </div>
        );
      default:
        return (
          <DashboardOverview 
            analytics={analytics} 
            isAdmin={user.role === 'admin'}
            loading={loading && retryCount > 0}
            onRetry={handleRetry}
          />
        );
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
