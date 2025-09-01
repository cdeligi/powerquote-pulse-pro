import { User } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Wrench, 
  FileText, 
  Settings, 
  LogOut, 
  Shield,
  Zap 
} from "lucide-react";

interface SidebarProps {
  user: User;
  activeView: string;
  onViewChange: (view: 'overview' | 'bom' | 'quotes' | 'admin') => void;
  onLogout: () => void;
}

const Sidebar = ({ user, activeView, onViewChange, onLogout }: SidebarProps) => {
  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: Home },
    { id: 'bom', label: 'BOM Builder', icon: Wrench },
    { id: 'quotes', label: 'Quotes', icon: FileText },
    ...(user.role === 'ADMIN' ? [{ id: 'admin' as const, label: 'Admin Panel', icon: Settings }] : [])
  ];

  const getRoleBadge = (role: string) => {
    const badges = {
      LEVEL_1: { text: 'Level 1 Sales', color: 'bg-blue-600' },
      LEVEL_2: { text: 'Level 2 Sales', color: 'bg-green-600' },
      LEVEL_3: { text: 'Level 3 Sales', color: 'bg-purple-600' }, // Added LEVEL_3
      ADMIN: { text: 'Administrator', color: 'bg-red-600' },
      FINANCE: { text: 'Finance', color: 'bg-yellow-600' } // Added FINANCE
    };
    return badges[role as keyof typeof badges] || badges.LEVEL_1; // Changed fallback to LEVEL_1
  };

  const badge = getRoleBadge(user.role);

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="h-6 w-6 text-red-600" />
          <Zap className="h-6 w-6 text-red-600" />
          <span className="text-white font-bold text-lg">PowerQuote</span>
        </div>
        
        <div className="space-y-2">
          <p className="text-white font-medium">{user.name}</p>
          <p className="text-gray-400 text-sm">{user.email}</p>
          <span className={`inline-block px-2 py-1 rounded-full text-xs text-white ${badge.color}`}>
            {badge.text}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <li key={item.id}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full justify-start text-left ${
                    isActive 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                  onClick={() => onViewChange(item.id as any)}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 space-y-4">
        {/* Qualitrol Logo */}
        <div className="flex justify-center">
          <img 
            src="/lovable-uploads/2955a70a-6714-4ded-af05-c5f87bbda099.png" 
            alt="Qualitrol Logo" 
            className="h-10 w-10 opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
          onClick={onLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
