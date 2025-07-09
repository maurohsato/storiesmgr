import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/supabase';
import { Database } from '../types/database';
import { UserCog, Edit, Shield, Mail, Calendar, Search, Filter } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Profile['role'];

const UserManagement: React.FC = () => {
  const { profile: currentProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentProfile?.role === 'admin') {
      loadProfiles();
    }
  }, [currentProfile]);

  const loadProfiles = async () => {
    try {
      setError(null);
      const data = await db.getProfiles();
      setProfiles(data);
    } catch (error) {
      console.error('Error loading profiles:', error);
      setError('Erro ao carregar usuários. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    if (!currentProfile || currentProfile.role !== 'admin') {
      alert('Apenas administradores podem alterar roles de usuários');
      return;
    }

    if (userId === currentProfile.id) {
      alert('Você não pode alterar seu próprio role');
      return;
    }

    setUpdating(true);
    try {
      await db.updateProfile(userId, { role: newRole });
      
      // Update local state
      setProfiles(prev => prev.map(p => 
        p.id === userId ? { ...p, role: newRole } : p
      ));
      
      setEditingUser(null);
      alert('Role atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Erro ao atualizar role do usuário. Tente novamente.');
    } finally {
      setUpdating(false);
    }
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

  const getRoleBadgeColor = (role: UserRole): string => {
    const colors: Record<UserRole, string> = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      project_manager: 'bg-blue-100 text-blue-800 border-blue-200',
      collaborator: 'bg-green-100 text-green-800 border-green-200',
      reader: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[role];
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || profile.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-red-900 mb-2">Erro ao carregar dados</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadProfiles}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gerencie usuários e suas permissões no sistema
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              >
                <option value="">Todos os roles</option>
                <option value="admin">Administrador</option>
                <option value="project_manager">Gerente de Projeto</option>
                <option value="collaborator">Colaborador</option>
                <option value="reader">Leitor</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            {filteredProfiles.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <UserCog className="h-5 w-5 text-orange-600" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-gray-900">
                              {profile.full_name || 'Nome não informado'}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {profile.id === currentProfile?.id ? '(Você)' : ''}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(profile.role)}`}>
                          {getRoleLabel(profile.role)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          <span className="truncate">{profile.email}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            Criado em {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {profile.id !== currentProfile?.id && (
                        <div className="mt-4">
                          <button
                            onClick={() => setEditingUser(profile)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Alterar Role
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserCog className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Nenhum usuário encontrado
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Tente ajustar os filtros para encontrar os usuários desejados.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-orange-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  Alterar Role do Usuário
                </h3>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Usuário:</strong> {editingUser.full_name || editingUser.email}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Role atual:</strong> {getRoleLabel(editingUser.role)}
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Novo Role:
                </label>
                <select
                  defaultValue={editingUser.role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    if (window.confirm(`Confirma a alteração do role para "${getRoleLabel(newRole)}"?`)) {
                      handleRoleUpdate(editingUser.id, newRole);
                    }
                  }}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  disabled={updating}
                >
                  <option value="reader">Leitor</option>
                  <option value="collaborator">Colaborador</option>
                  <option value="project_manager">Gerente de Projeto</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <div className="text-sm text-yellow-800">
                  <p><strong>Leitor:</strong> Apenas visualização</p>
                  <p><strong>Colaborador:</strong> Criar/editar próprias histórias</p>
                  <p><strong>Gerente:</strong> CRUD completo exceto usuários</p>
                  <p><strong>Admin:</strong> Controle total do sistema</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setEditingUser(null)}
                  disabled={updating}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;