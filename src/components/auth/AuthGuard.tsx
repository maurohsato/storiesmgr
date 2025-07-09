import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Database } from '../../types/database';
import { Shield, AlertTriangle } from 'lucide-react';

type UserRole = Database['public']['Tables']['profiles']['Row']['role'];

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: UserRole | UserRole[];
  fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredRoles,
  fallback 
}) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!profile) {
    return null; // This should be handled by the main auth flow
  }

  // If no specific roles required, just check if user is authenticated
  if (!requiredRoles) {
    return <>{children}</>;
  }

  // Check if user has required role(s)
  const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const hasRequiredRole = rolesArray.includes(profile.role);

  if (!hasRequiredRole) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-64 p-8">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acesso Negado
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Você não tem permissão para acessar esta funcionalidade.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
              <div className="text-sm text-yellow-800">
                <p><strong>Seu perfil atual:</strong> {getRoleLabel(profile.role)}</p>
                <p><strong>Perfil necessário:</strong> {rolesArray.map(getRoleLabel).join(' ou ')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    admin: 'Administrador',
    project_manager: 'Gerente de Projeto',
    collaborator: 'Colaborador',
    reader: 'Leitor',
  };
  return labels[role];
};

export default AuthGuard;