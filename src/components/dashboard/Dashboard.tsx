
import { useState } from "react";
import { User } from "@/types/auth";
import Sidebar from "./Sidebar";
import EnhancedDashboardOverview from "./EnhancedDashboardOverview";
import HierarchicalBOMBuilder from "../bom/HierarchicalBOMBuilder";
import QuoteManager from "../quotes/QuoteManager";
import AdminPanel from "../admin/AdminPanel";
import { BOMItem } from "@/types/product";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type ActiveView = 'overview' | 'bom' | 'quotes' | 'admin';

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);

  const handleBOMUpdate = (items: BOMItem[]) => {
    setBomItems(items);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <EnhancedDashboardOverview user={user} />;
      case 'bom':
        return (
          <HierarchicalBOMBuilder
            isOpen={true}
            onClose={() => setActiveView('overview')}
            mode="create"
          />
        );
      case 'quotes':
        return <QuoteManager user={user} />;
      case 'admin':
        return user.role === 'admin' ? <AdminPanel user={user} /> : <div className="text-white">Access Denied</div>;
      default:
        return <EnhancedDashboardOverview user={user} />;
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
      <main className="flex-1 ml-64">
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;
