import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernSidebarProps {
  user: {
    email: string;
    full_name?: string;
    role?: string;
  };
  onLogout: () => void;
}

export function ModernSidebar({ user, onLogout }: ModernSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { title: 'Products', icon: Package, path: '/products' },
    ...(user.role === 'ADMIN'
      ? [{ title: 'Admin Panel', icon: Settings, path: '/admin' }]
      : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    const roleConfig = {
      ADMIN: { label: 'Admin', className: 'bg-destructive text-destructive-foreground' },
      SALES: { label: 'Sales', className: 'bg-blue-500 text-white' },
      ENGINEER: { label: 'Engineer', className: 'bg-green-500 text-white' },
    };
    const config = roleConfig[role as keyof typeof roleConfig] || { label: role, className: 'bg-muted' };
    return <Badge className={cn('text-xs', config.className)}>{config.label}</Badge>;
  };

  // Desktop sidebar content
  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* User section */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {user.full_name?.[0] || user.email[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{user.full_name || user.email}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              {user.role && <div className="mt-1">{getRoleBadge(user.role)}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          const button = (
            <Button
              variant={active ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3 transition-all duration-200',
                collapsed && 'justify-center',
                active && 'bg-accent font-medium'
              )}
              onClick={() => navigate(item.path)}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Button>
          );

          return collapsed ? (
            <TooltipProvider key={item.title} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div key={item.title}>{button}</div>
          );
        })}
      </nav>

      {/* Footer with logo and logout */}
      <div className="border-t border-border p-4 space-y-3">
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-2')}>
          <img
            src="/lovable-uploads/2955a70a-6714-4ded-af05-c5f87bbda099.png"
            alt="PowerQuotePro"
            className={cn('h-8', collapsed && 'w-8')}
          />
          {!collapsed && (
            <span className="text-sm font-semibold">PowerQuotePro</span>
          )}
        </div>

        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-center"
                  onClick={onLogout}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={onLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-200 ease-out z-40 group"
        style={{ width: isExpanded ? '256px' : '64px' }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        onFocus={() => setIsExpanded(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsExpanded(false);
          }
        }}
      >
        <SidebarContent collapsed={!isExpanded} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
