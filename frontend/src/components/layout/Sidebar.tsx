import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  Phone,
  Target,
  BarChart3,
  Building2,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Brain,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'company_admin', 'manager', 'technician', 'dispatcher'] },
  { name: 'Customers', href: '/customers', icon: Users, roles: ['super_admin', 'company_admin', 'manager', 'dispatcher'] },
  { name: 'Equipment', href: '/equipment', icon: Wrench, roles: ['super_admin', 'company_admin', 'manager', 'technician'] },
  { name: 'Agreements', href: '/agreements', icon: FileText, roles: ['super_admin', 'company_admin', 'manager', 'dispatcher'] },
  { name: 'Service Calls', href: '/service-calls', icon: Phone, roles: ['super_admin', 'company_admin', 'manager', 'technician', 'dispatcher'] },
  { name: 'Opportunities', href: '/opportunities', icon: Target, roles: ['super_admin', 'company_admin', 'manager'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['super_admin', 'company_admin', 'manager'] },
  { name: 'AI Insights', href: '/insights', icon: Brain, roles: ['super_admin', 'company_admin', 'manager'] },
  { name: 'Companies', href: '/companies', icon: Building2, roles: ['super_admin'] },
  { name: 'Admin', href: '/admin', icon: Shield, roles: ['super_admin'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && (
            <span className="text-lg font-bold text-primary-600 dark:text-primary-400 truncate">
              HVAC RenewIQ
            </span>
          )}
          <button
            className="hidden lg:block p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <item.icon size={20} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {!collapsed && user && (
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut size={18} />
              {!collapsed && <span className="text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}