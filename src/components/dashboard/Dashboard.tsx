
import { useState } from "react";
import { User } from "@/types/auth";
import Sidebar from "./Sidebar";
import DashboardOverview from "./DashboardOverview";
import BOMBuilder from "../bom/BOMBuilder";
import QuoteManager from "../quotes/QuoteManager";
import AdminPanel from "../admin/AdminPanel";
import { BOMItem } from "@/types/product";
import { usePermissions, FEATURES } from "@/hooks/usePermissions";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type ActiveView = 'overview' | 'bom' | 'quotes' | 'admin';

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const { has } = usePermissions();

  const handleBOMUpdate = (items: BOMItem[]) => {
    setBomItems(items);
  };

  // Compute permissions for BOM
  const canSeeCosts = has(FEATURES.BOM_SHOW_PRODUCT_COST);

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <DashboardOverview user={user} />;
      case 'bom':
        return (
          <BOMBuilder 
            onBOMUpdate={handleBOMUpdate}
            canSeePrices={user.role === 'ADMIN' || user.role === 'FINANCE' || user.role === 'LEVEL_3'}
            canSeeCosts={canSeeCosts}
          />
        );
      case 'quotes':
        return <QuoteManager user={user} />;
      case 'admin':
        return user.role === 'ADMIN' ? <AdminPanel user={user} /> : <div className="text-white">Access Denied</div>;
      default:
        return <DashboardOverview user={user} />;
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
