import { useState, useEffect } from "react";
import { useLocation, Routes, Route, Navigate } from "react-router-dom";
import { User } from "@/types/auth";
import Sidebar from "./Sidebar";
import DashboardOverview from "./DashboardOverview";
import BOMBuilder from "../bom/BOMBuilder";
import QuoteManager from "../quotes/QuoteManager";
import QuoteViewer from "../bom/QuoteViewer";
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

  // Check for hash-based navigation (legacy support)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#configure') {
      setActiveView('bom');
    } else if (hash === '#quotes') {
      setActiveView('quotes');
    } else if (hash === '#admin') {
      setActiveView('admin');
    } else if (hash === '#overview' || hash === '') {
      setActiveView('overview');
    }
  }, [location]);

  const renderContent = () => {
  // Handle React Router routes for BOM editing
    if (location.pathname.startsWith('/bom-edit/')) {
      const quoteId = location.pathname.split('/bom-edit/')[1];
      // Set active view to bom when editing quotes
      if (activeView !== 'bom') {
        setActiveView('bom');
      }
      return (
        <BOMProvider>
          <BOMBuilder 
            onBOMUpdate={handleBOMUpdate}
            canSeePrices={true}
            canSeeCosts={canSeeCosts}
            quoteId={quoteId}
            mode="edit"
          />
        </BOMProvider>
      );
    }
    
    // Handle React Router routes for new BOM
    if (location.pathname.startsWith('/bom-new')) {
      // Set active view to bom when creating new quotes
      if (activeView !== 'bom') {
        setActiveView('bom');
      }
      return (
        <BOMProvider>
          <BOMBuilder 
            onBOMUpdate={handleBOMUpdate}
            canSeePrices={true}
            canSeeCosts={canSeeCosts}
            mode="new"
          />
        </BOMProvider>
      );
    }

    // Handle React Router routes for quotes
    if (location.pathname.startsWith('/quote/')) {
      return <QuoteViewer />;
    }
    
    // Handle Level 4 config routes
    if (location.pathname.startsWith('/admin/level4-config/')) {
      const match = location.pathname.match(/^\/admin\/level4-config\/([^/]+)$/);
      const productId = match?.[1];
      return <AdminLevel4ConfigPage productId={productId} />;
    }

    // Legacy hash-based routing
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
              mode="new"
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

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar 
        user={user}
        activeView={activeView}
        onViewChange={setActiveView}
        onLogout={onLogout}
      />
      <main className="flex-1 ml-64 p-8">
        <Routes>
          {/* BOM editing routes */}
          <Route path="/bom-edit/:quoteId" element={renderContent()} />
          <Route path="/bom-new" element={renderContent()} />
          
          {/* Quote viewing routes */}
          <Route path="/quote/:id" element={<QuoteViewer />} />
          
          {/* Admin Level 4 config routes */}
          <Route path="/admin/level4-config/:productId" element={
            <AdminLevel4ConfigPage productId={location.pathname.split('/').pop()} />
          } />
          
          {/* Default route - render based on activeView */}
          <Route path="*" element={renderContent()} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;
