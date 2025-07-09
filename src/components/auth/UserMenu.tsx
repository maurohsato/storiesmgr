import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.tsx';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';

const UserMenu: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!profile) return null;

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      project_manager: 'Gerente de Projeto',
      collaborator: 'Colaborador',
      reader: 'Leitor',
    };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      project_manager: 'bg-blue-100 text-blue-800',
      collaborator: 'bg-green-100 text-green-800',
      reader: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 p-2 hover:bg-orange-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
            <User className="h-4 w-4 text-orange-600" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium text-gray-900">
              {profile.full_name || profile.email}
            </div>
            <div className="text-xs text-gray-500">
              {getRoleLabel(profile.role)}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile.full_name || 'Usuário'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {profile.email}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getRoleBadgeColor(profile.role)}`}>
                      {getRoleLabel(profile.role)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // TODO: Implement profile settings
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Settings className="h-4 w-4 mr-3" />
                  Configurações do Perfil
                </button>
                
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;