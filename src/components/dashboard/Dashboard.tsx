import { useState, useEffect } from "react";
import { useLocation, Routes, Route, Navigate } from "react-router-dom";
import { User } from "@/types/auth";
import { ModernSidebar } from "./ModernSidebar";
import BOMBuilder from "../bom/BOMBuilder";
import QuoteManager from "../quotes/QuoteManager";
import QuoteViewer from "../bom/QuoteViewer";
import AdminPanel from "../admin/AdminPanel";
import AdminLevel4ConfigPage from "@/pages/admin/AdminLevel4ConfigPage";
import { BOMItem } from "@/types/product";
import { usePermissions, FEATURES } from "@/hooks/usePermissions";
import { productDataService } from "@/services/productDataService";
import { BOMProvider } from "@/context/BOMContext";
import PricingAnalysisDashboard from "./PricingAnalysisDashboard";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type ActiveView = 'quotes' | 'bom' | 'admin' | 'pricing-analysis';

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<ActiveView>('quotes');
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

  // Listen to hash changes for navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log('Hash changed to:', hash);
      
      if (hash === '#quotes' || hash === '' || hash === '#') {
        setActiveView('quotes');
      } else if (hash === '#admin') {
        setActiveView('admin');
      } else if (hash === '#bom') {
        setActiveView('bom');
      } else if (hash === '#pricing-analysis') {
        setActiveView('pricing-analysis');
      }
    };

    // Run on mount to sync initial state
    handleHashChange();

    // Listen to hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Handle path-based routing (not hash-based)
  useEffect(() => {
    const path = location.pathname;
    
    if (path.startsWith('/bom-edit/') || path === '/bom-new') {
      setActiveView('bom');
    }
    // Don't set activeView for root path - let hash handler do it
  }, [location.pathname]);

  const renderContent = () => {
    // Handle React Router routes for BOM editing
    if (location.pathname.startsWith('/bom-edit/')) {
      const encodedQuoteId = location.pathname.split('/bom-edit/')[1];
      const quoteId = encodedQuoteId ? decodeURIComponent(encodedQuoteId) : '';
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
      case 'pricing-analysis':
        return <PricingAnalysisDashboard />;
      case 'admin': {
        const canAccessAdmin = has(FEATURES.ACCESS_ADMIN_PANEL) || ['ADMIN','MASTER'].includes(user.role);
        if (canAccessAdmin) return <AdminPanel user={user} />;

        // Avoid blank-looking page on light themes when hash points to #admin without access.
        if (typeof window !== 'undefined' && window.location.hash === '#admin') {
          window.location.hash = 'quotes';
        }

        return <QuoteManager user={user} />;
      }
      default:
        return <QuoteManager user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModernSidebar 
        user={user}
        onLogout={onLogout}
      />
      <main className="md:ml-16 transition-all duration-200 p-4 pt-16 md:pt-8 md:p-8">
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
