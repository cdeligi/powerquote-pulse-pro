import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  LogOut,
  Menu,
  Wrench,
  FileText,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FEATURES, usePermissions } from '@/hooks/usePermissions';

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
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { has } = usePermissions();

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const canAccessAdminPanel = has(FEATURES.ACCESS_ADMIN_PANEL) || user.role === 'ADMIN' || user.role === 'MASTER';

  const menuItems = [
    { title: 'BOM Builder', icon: Wrench, path: '/bom-new', viewId: 'bom', useHash: false },
    { title: 'Quotes', icon: FileText, path: '/', viewId: 'quotes', useHash: true },
    { title: 'Pricing Analysis', icon: BarChart3, path: '/', viewId: 'pricing-analysis', useHash: true },
    ...(canAccessAdminPanel
      ? [{ title: 'Admin Panel', icon: Settings, path: '/', viewId: 'admin', useHash: true }]
      : []),
  ];

  const isActive = (item: any) => {
    if (item.useHash) {
      const onRootPath = location.pathname === '/';
      const hashMatches = currentHash === `#${item.viewId}`;
      return onRootPath && hashMatches;
    }
    return location.pathname === item.path || (item.path === '/bom-new' && location.pathname.startsWith('/bom'));
  };

  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    const roleConfig = {
      SALES: { label: 'Sales', className: 'bg-blue-500 text-white' },
      ADMIN: { label: 'Admin', className: 'bg-destructive text-destructive-foreground' },
      FINANCE: { label: 'Finance', className: 'bg-amber-500 text-white' },
      MASTER: { label: 'Master', className: 'bg-slate-600 text-white' },
    };
    const config = roleConfig[role as keyof typeof roleConfig] || { label: role, className: 'bg-muted' };
    return <Badge className={cn('text-xs', config.className)}>{config.label}</Badge>;
  };

  // Desktop sidebar content
  const SidebarContent = ({ collapsed = false, isMobile = false }: { collapsed?: boolean; isMobile?: boolean }) => (
    <div className="flex h-full flex-col overflow-hidden">
      {/* User section */}
      <div className="border-b border-border p-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {user.full_name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{user.full_name || user.email}</p>
              <p className="truncate text-xs text-muted-foreground leading-tight mt-0.5">{user.email}</p>
              {user.role && <div className="mt-1.5">{getRoleBadge(user.role)}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          const button = (
            <Button
              variant={active ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3 transition-all duration-200',
                collapsed && 'justify-center px-2',
                active && 'bg-accent font-medium'
              )}
                  onClick={() => {
                    if (item.useHash) {
                      // Navigate to root first, THEN set the hash
                      if (location.pathname !== '/') {
                        navigate('/');
                        // Use setTimeout to ensure navigation completes before setting hash
                        setTimeout(() => {
                          window.location.hash = item.viewId;
                        }, 0);
                      } else {
                        // Already on root, just set hash
                        window.location.hash = item.viewId;
                      }
                    } else {
                      navigate(item.path);
                    }
                    if (isMobile) {
                      setMobileOpen(false);
                    }
                  }}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
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
      <div className="border-t border-border p-3 space-y-2 flex-shrink-0">
        <div className={cn('flex items-center min-w-0', collapsed ? 'justify-center' : 'gap-2')}>
          <img
            src="/lovable-uploads/2955a70a-6714-4ded-af05-c5f87bbda099.png"
            alt="PowerQuotePro"
            className={cn('h-7 object-contain', collapsed ? 'w-7' : 'max-w-full')}
          />
          {!collapsed && (
            <span className="text-sm font-semibold truncate">PowerQuotePro</span>
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
        className="hidden md:flex fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-200 ease-out z-40 group overflow-hidden flex-shrink-0"
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
        <div className="w-full h-full">
          <SidebarContent collapsed={!isExpanded} />
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
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
          <SidebarContent isMobile={true} />
        </SheetContent>
      </Sheet>
    </>
  );
}
