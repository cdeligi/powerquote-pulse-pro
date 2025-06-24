
import { useState } from "react";
import Sidebar from "./Sidebar";
import DashboardOverview from "./DashboardOverview";
import BOMBuilder from "@/components/bom/BOMBuilder";
import QuoteManager from "@/components/quotes/QuoteManager";
import QuoteAnalyticsDashboard from "./QuoteAnalyticsDashboard";
import AdminPanel from "@/components/admin/AdminPanel";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'level1' | 'level2' | 'admin';
  department?: string;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState('overview');
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'overview':
        return <DashboardOverview user={user} />;
      case 'bom-builder':
        return <BOMBuilder user={user} />;
      case 'quote-manager':
        return <QuoteManager user={user} />;
      case 'analytics':
        return user.role === 'level2' || user.role === 'admin' ? 
          <QuoteAnalyticsDashboard user={user} /> : 
          <div className="p-6 text-white">Access denied. Level 2 or Admin access required.</div>;
      case 'admin':
        return user.role === 'admin' ? 
          <AdminPanel user={user} /> : 
          <div className="p-6 text-white">Access denied. Admin access required.</div>;
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
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto">
        {renderActiveView()}
      </main>
    </div>
  );
};

export default Dashboard;
