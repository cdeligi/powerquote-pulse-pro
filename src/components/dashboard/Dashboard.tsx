
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

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type ActiveView = 'overview' | 'bom' | 'quotes' | 'admin';

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [analytics, setAnalytics] = useState<QuoteAnalytics>(calculateQuoteAnalytics([]));

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        await supabase.rpc('update_quote_analytics');
        const { data, error } = await supabase
          .from('quotes')
          .select('id,status,discounted_value,gross_profit,discounted_margin,created_at');
        if (error || !data) {
          console.error('Failed to fetch quotes for analytics', error);
          return;
        }
        const quoteData: QuoteData[] = (data as any[]).map((q) => ({
          id: q.id,
          status: q.status,
          total: q.discounted_value,
          grossProfit: q.gross_profit,
          margin: q.discounted_margin,
          createdAt: q.created_at,
        }));
        setAnalytics(calculateQuoteAnalytics(quoteData));
      } catch (err) {
        console.error('Failed to load analytics', err);
      }
    };

    fetchAnalytics();
  }, []);

  const handleBOMUpdate = (items: BOMItem[]) => {
    setBomItems(items);
  };

  const renderContent = () => {
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
