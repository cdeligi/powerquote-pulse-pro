
import { useState, useEffect } from 'react';
import { User } from '@/types/auth';
import DashboardOverview from './DashboardOverview';
import BOMBuilder from '@/components/bom/BOMBuilder';
import QuoteManager from '@/components/quotes/QuoteManager';
import AdminPanel from '@/components/admin/AdminPanel';
import Sidebar from './Sidebar';
import { BOMItem } from '@/types/product';

interface DashboardProps {
  user: User;
}

const Dashboard = ({ user }: DashboardProps) => {
  const [activeView, setActiveView] = useState<string>('overview');
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);

  const canSeePrices = user.role === 'admin' || user.role === 'level2' || user.role === 'level3';

  const handleBOMUpdate = (items: BOMItem[]) => {
    setBomItems(items);
  };

  const handleDiscountUpdate = (newDiscount: number) => {
    setDiscount(newDiscount);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <DashboardOverview user={user} />;
      case 'bom-builder':
        return (
          <BOMBuilder 
            onBOMUpdate={handleBOMUpdate}
            onDiscountUpdate={handleDiscountUpdate}
            canSeePrices={canSeePrices}
            userId={user.id}
          />
        );
      case 'quotes':
        return <QuoteManager user={user} />;
      case 'admin':
        return user.role === 'admin' ? <AdminPanel user={user} /> : <div>Access Denied</div>;
      default:
        return <DashboardOverview user={user} />;
    }
  };

  return (
    <div className="flex h-screen bg-black">
      <Sidebar
        user={user}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;
