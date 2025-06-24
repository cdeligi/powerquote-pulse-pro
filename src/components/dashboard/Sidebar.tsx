
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  FileText, 
  Settings, 
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Calculator,
  BarChart3,
  Shield,
  Building2
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'level1' | 'level2' | 'admin';
  department?: string;
}

interface SidebarProps {
  user: User;
  activeView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

const Sidebar = ({ user, activeView, onViewChange, onLogout }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home, roles: ['level1', 'level2', 'admin'] },
    { id: 'bom-builder', label: 'BOM Builder', icon: Calculator, roles: ['level1', 'level2', 'admin'] },
    { id: 'quote-manager', label: 'Quote Manager', icon: FileText, roles: ['level1', 'level2', 'admin'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['level2', 'admin'] },
    { id: 'admin', label: 'Admin Panel', icon: Shield, roles: ['admin'] },
  ];

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      level1: 'bg-green-600',
      level2: 'bg-blue-600',
      admin: 'bg-red-600'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-600';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      level1: 'Level 1 Sales',
      level2: 'Level 2 Sales',
      admin: 'Administrator'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const visibleMenuItems = menuItems.filter(item => 
    item.roles.includes(user.role as any)
  );

  return (
    <div className={`bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-red-500" />
              <span className="text-lg font-bold text-white">PowerQuotePro</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-800">
          <div className="space-y-2">
            <p className="text-white font-medium">{user.name}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
            <Badge className={`${getRoleBadgeColor(user.role)} text-white text-xs`}>
              {getRoleLabel(user.role)}
            </Badge>
            {user.department && (
              <p className="text-xs text-gray-500">{user.department}</p>
            )}
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start ${
                  isActive 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                } ${isCollapsed ? 'px-2' : 'px-3'}`}
                onClick={() => onViewChange(item.id)}
              >
                <Icon className={`h-4 w-4 ${isCollapsed ? '' : 'mr-2'}`} />
                {!isCollapsed && item.label}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-800">
        <Button
          variant="ghost"
          className={`w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 ${
            isCollapsed ? 'px-2' : 'px-3'
          }`}
          onClick={onLogout}
        >
          <LogOut className={`h-4 w-4 ${isCollapsed ? '' : 'mr-2'}`} />
          {!isCollapsed && 'Logout'}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
