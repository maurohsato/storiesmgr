import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Building2, FolderOpen, FileText, Menu, X, UserCog, Database } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import UserMenu from './auth/UserMenu';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { canManageUsers, canManageContent, profile, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Debug: log user state
  console.log('Layout - User:', user?.email, 'Profile:', profile?.email, 'Role:', profile?.role);

  const baseNavigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Histórias', href: '/stories', icon: FileText },
  ];
  
  const managementNavigation = [
    { name: 'Times', href: '/teams', icon: Users, requiresManagement: true },
    { name: 'Clientes', href: '/clients', icon: Building2, requiresManagement: true },
    { name: 'Projetos', href: '/projects', icon: FolderOpen, requiresManagement: true },
  ];
  
  const adminNavigation = [
    { name: 'Usuários', href: '/users', icon: UserCog, requiresAdmin: true },
    { name: 'Validar Supabase', href: '/supabase-validation', icon: Database, requiresAdmin: true },
  ];

  // Filtrar navegação baseado nas permissões reais
  const navigation = [
    ...baseNavigation,
    ...(canManageContent() ? managementNavigation.filter(item => !item.requiresManagement || canManageContent()) : []),
    ...(canManageUsers() ? adminNavigation.filter(item => !item.requiresAdmin || canManageUsers()) : []),
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-50">
      <nav className="bg-white shadow-lg border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <img 
                  src="/image.png" 
                  alt="Inectar Logo" 
                  className="h-10 w-auto"
                />
                <span className="ml-3 text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                  User Stories Manager
                </span>
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Supabase
                </span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'border-orange-500 text-orange-900'
                          : 'border-transparent text-gray-600 hover:border-orange-300 hover:text-orange-700'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2 text-orange-600" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center">
              {/* User Menu - Desktop */}
              <div className="hidden sm:flex sm:items-center">
                <UserMenu />
              </div>
              
              {/* Mobile menu button */}
              <div className="sm:hidden flex items-center ml-2">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-orange-700 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
                >
                  {isMobileMenuOpen ? (
                    <X className="block h-6 w-6" />
                  ) : (
                    <Menu className="block h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="sm:hidden">
              <div className="pt-2 pb-3 border-t border-gray-200">
                <UserMenu />
              </div>
              <div className="border-t border-gray-200">
                <div className="pt-2 pb-3 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                          isActive(item.href)
                            ? 'bg-orange-50 border-orange-500 text-orange-900'
                            : 'border-transparent text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700'
                        }`}
                      >
                        <div className="flex items-center">
                          <Icon className="h-5 w-5 mr-3 text-orange-600" />
                          {item.name}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;