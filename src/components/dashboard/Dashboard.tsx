import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { User } from "@/types/auth";
import Sidebar from "./Sidebar";
import DashboardOverview from "./DashboardOverview";
import BOMBuilder from "../bom/BOMBuilder";
import QuoteManager from "../quotes/QuoteManager";
import AdminPanel from "../admin/AdminPanel";
import AdminLevel4ConfigPage from "@/pages/admin/AdminLevel4ConfigPage";
import { BOMItem } from "@/types/product";
import { usePermissions, FEATURES } from "@/hooks/usePermissions";
import { productDataService } from "@/services/productDataService";
import { BOMProvider } from "@/context/BOMContext";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type ActiveView = 'overview' | 'bom' | 'quotes' | 'admin';

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const { has } = usePermissions();
  const location = useLocation();
  
  // Check if we're on a Level 4 configuration page
  const isLevel4ConfigPage = location.pathname.startsWith('/admin/level4-config/');

  // Initialize ProductDataService when dashboard loads
  useEffect(() => {
    const initializeProducts = async () => {
      try {
        console.log('Initializing ProductDataService...');
        await productDataService.initialize();
        console.log('ProductDataService initialized successfully');
      } catch (error) {
        console.error('Failed to initialize ProductDataService:', error);
      }
    };

    initializeProducts();
  }, []);

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
          <BOMProvider>
            <BOMBuilder 
              onBOMUpdate={handleBOMUpdate}
              canSeePrices={true}
              canSeeCosts={canSeeCosts}
            />
          </BOMProvider>
        );
      case 'quotes':
        return <QuoteManager user={user} />;
      case 'admin':
        return user.role === 'ADMIN' ? <AdminPanel user={user} /> : <div className="text-white">Access Denied</div>;
      default:
        return <DashboardOverview user={user} />;
    }
  };

  // If we're on a Level 4 config page, render it directly
  if (isLevel4ConfigPage) {
    const match = location.pathname.match(/^\/admin\/level4-config\/([^/]+)$/);
    const productId = match?.[1];
    console.log('Level4 config route detected:', { pathname: location.pathname, productId });
    
    return (
      <div className="min-h-screen bg-background text-foreground flex">
        <Sidebar 
          user={user}
          activeView="admin"
          onViewChange={setActiveView}
          onLogout={onLogout}
        />
        <main className="flex-1 ml-64 p-8">
          <AdminLevel4ConfigPage productId={productId} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
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
