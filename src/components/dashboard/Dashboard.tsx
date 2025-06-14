
import { useState } from "react";
import { User } from "@/types/auth";
import { UserProvider } from "@/context/UserContext";
import Sidebar from "./Sidebar";
import DashboardOverview from "./DashboardOverview";
import BOMBuilder from "../bom/BOMBuilder";
import QuoteManager from "../quotes/QuoteManager";
import AdminPanel from "../admin/AdminPanel";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type ActiveView = 'overview' | 'bom' | 'quotes' | 'admin';

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<ActiveView>('overview');

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <DashboardOverview user={user} />;
      case 'bom':
        return <BOMBuilder onQuoteUpdate={() => {}} />;
      case 'quotes':
        return <QuoteManager user={user} />;
      case 'admin':
        return user.role === 'admin' ? <AdminPanel user={user} /> : <div className="text-white">Access Denied</div>;
      default:
        return <DashboardOverview user={user} />;
    }
  };

  return (
    <UserProvider user={user}>
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
    </UserProvider>
  );
};

export default Dashboard;
