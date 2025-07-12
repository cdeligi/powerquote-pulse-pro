/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary.
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { User } from "@/types/auth";
import {
  Home,
  FileText,
  Calculator,
  Wrench,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Shield,
  Zap
} from 'lucide-react';

interface SidebarProps {
  user: User;
  activeView: string;
  onViewChange: (view: 'overview' | 'bom' | 'quotes' | 'admin') => void;
  onLogout: () => void;
}

const Sidebar = ({ user, activeView, onViewChange, onLogout }: SidebarProps) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(true); // Default to collapsed
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isExpanded = isHovered || isFocused || !isCollapsed;

  // Handle reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: Home },
    { id: 'bom', label: 'BOM Builder', icon: Calculator },
    { id: 'quotes', label: 'Quotes', icon: FileText },
    ...(user.role === 'admin' ? [{ id: 'admin' as const, label: 'Admin Panel', icon: Wrench }] : [])
  ];

  const getRoleBadge = (role: string) => {
    const badges = {
      level1: { text: 'Level 1 Sales', color: 'bg-blue-600' },
      level2: { text: 'Level 2 Sales', color: 'bg-green-600' },
      admin: { text: 'Administrator', color: 'bg-red-600' }
    };
    return badges[role as keyof typeof badges] || badges.level1;
  };

  const badge = getRoleBadge(user.role);

  return (
    <aside 
      className={cn(
        "group fixed left-0 top-0 h-screen bg-gray-900 border-r border-gray-800 flex flex-col z-40",
        prefersReducedMotion ? "" : "transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={-1}
      aria-expanded={isExpanded}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "flex items-center space-x-2",
            prefersReducedMotion ? "" : "transition-opacity duration-200",
            isExpanded ? "opacity-100" : "opacity-0"
          )}>
            <Shield className="h-6 w-6 text-red-600" />
            <Zap className="h-6 w-6 text-red-600" />
            <span className="text-white font-bold text-lg">PowerQuote</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 text-gray-400 hover:text-white"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* User Info */}
        <div className={cn(
          "space-y-2",
          prefersReducedMotion ? "" : "transition-opacity duration-200",
          isExpanded ? "opacity-100" : "opacity-0"
        )}>
          <p className="text-white font-medium truncate">{user.name}</p>
          <p className="text-gray-400 text-sm truncate">{user.email}</p>
          <span className={`inline-block px-2 py-1 rounded-full text-xs text-white ${badge.color}`}>
            {badge.text}
          </span>
        </div>

        {/* Collapsed User Avatar */}
        {!isExpanded && (
          <div className="flex justify-center mt-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
              {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4" role="navigation">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <li key={item.id}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start text-left",
                    prefersReducedMotion ? "" : "transition-colors",
                    isActive 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-800',
                    "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
                    !isExpanded ? "px-2" : "px-3"
                  )}
                  onClick={() => onViewChange(item.id as any)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isExpanded ? "mr-3" : "")} aria-hidden="true" />
                  <span className={cn(
                    "truncate",
                    prefersReducedMotion ? "" : "transition-opacity duration-200",
                    isExpanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    {item.label}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <footer className="p-4 border-t border-gray-800 space-y-4">
        {/* Qualitrol Logo */}
        <div className="flex justify-center">
          <img 
            src="/lovable-uploads/2955a70a-6714-4ded-af05-c5f87bbda099.png" 
            alt="Qualitrol Logo" 
            className={cn(
              "h-10 w-10 opacity-90 hover:opacity-100",
              prefersReducedMotion ? "" : "transition-opacity"
            )}
          />
        </div>
        
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800",
            prefersReducedMotion ? "" : "transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
            !isExpanded ? "px-2" : "px-3"
          )}
          onClick={onLogout}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          <LogOut className={cn("h-4 w-4 shrink-0", isExpanded ? "mr-3" : "")} aria-hidden="true" />
          <span className={cn(
            "truncate",
            prefersReducedMotion ? "" : "transition-opacity duration-200",
            isExpanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            Sign Out
          </span>
        </Button>
      </footer>
    </aside>
  );
};

export default Sidebar;