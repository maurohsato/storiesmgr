import React from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import AuthDiagnostic from '../components/AuthDiagnostic';
import { Users, Building2, FolderOpen, FileText, Plus, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { teams, clients, projects, userStories } = useAppContext();
  const { profile, user, canManageUsers, canManageContent } = useAuth();

  console.log('Dashboard - User:', user?.email, 'Profile:', profile?.email, 'Role:', profile?.role);
  console.log('Dashboard - Permissions:', { 
    canManageUsers: canManageUsers(), 
    canManageContent: canManageContent() 
  });

  // Show diagnostic for admin users
  if (profile?.role === 'admin') {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard Administrativo</h1>
          <p className="mt-2 text-sm text-gray-700">
            Bem-vindo, administrador! Aqui está o diagnóstico do sistema.
          </p>
        </div>
        
        <AuthDiagnostic />
        
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/users"
              className="relative rounded-lg border-2 border-dashed border-orange-200 p-6 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
            >
              <div className="text-center">
                <Users className="mx-auto h-8 w-8 text-orange-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  Gerenciar Usuários
                </span>
              </div>
            </Link>
            <Link
              to="/teams/new"
              className="relative rounded-lg border-2 border-dashed border-orange-200 p-6 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
            >
              <div className="text-center">
                <Plus className="mx-auto h-8 w-8 text-orange-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  Novo Time
                </span>
              </div>
            </Link>
            <Link
              to="/clients/new"
              className="relative rounded-lg border-2 border-dashed border-orange-200 p-6 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
            >
              <div className="text-center">
                <Plus className="mx-auto h-8 w-8 text-orange-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  Novo Cliente
                </span>
              </div>
            </Link>
            <Link
              to="/projects/new"
              className="relative rounded-lg border-2 border-dashed border-orange-200 p-6 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
            >
              <div className="text-center">
                <Plus className="mx-auto h-8 w-8 text-orange-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  Novo Projeto
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show restricted message for readers
  if (profile?.role === 'reader') {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8">
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🚫</span>
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-red-900 mb-4">
                Acesso Negado
              </h1>
              
              <p className="text-red-800 mb-6">
                Sua conta não possui permissões para acessar o sistema. Usuários com perfil "Leitor" 
                não têm acesso a nenhuma funcionalidade até que um administrador altere suas permissões.
              </p>
              
              <div className="bg-white border border-red-300 rounded-md p-4 text-left mb-6">
                <h3 className="font-medium text-red-900 mb-3">📋 Para obter acesso:</h3>
                <ol className="text-sm text-red-800 space-y-2 list-decimal list-inside">
                  <li>Entre em contato com um administrador do sistema</li>
                  <li>Solicite as permissões adequadas para sua função</li>
                  <li>Aguarde a aprovação e alteração do seu perfil</li>
                  <li>Faça logout e login novamente após a aprovação</li>
                </ol>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">👥 Contatos dos Administradores:</h4>
                <p className="text-sm text-blue-800">
                  <strong>Email:</strong> admin@demo.com<br />
                  <strong>Perfil necessário:</strong> Colaborador (mínimo) para criar histórias
                </p>
              </div>
              
              <div className="text-sm text-red-700 bg-red-100 p-3 rounded">
                <p><strong>Seu perfil atual:</strong> {getRoleLabel(profile.role)} (Sem Acesso)</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Criado em:</strong> {new Date(profile.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      project_manager: 'Gerente de Projeto',
      collaborator: 'Colaborador',
      reader: 'Leitor',
    };
    return labels[role] || role;
  };

  const stats = [
    {
      name: 'Times',
      value: teams.length,
      icon: Users,
      color: 'bg-orange-500',
      href: '/teams',
    },
    {
      name: 'Clientes',
      value: clients.length,
      icon: Building2,
      color: 'bg-orange-600',
      href: '/clients',
    },
    {
      name: 'Projetos',
      value: projects.length,
      icon: FolderOpen,
      color: 'bg-orange-700',
      href: '/projects',
    },
    {
      name: 'Histórias',
      value: userStories.length,
      icon: FileText,
      color: 'bg-orange-800',
      href: '/stories',
    },
  ];

  const recentProjects = projects.slice(-3).reverse();
  const recentStories = userStories.slice(-5).reverse();

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Visão geral do sistema de gerenciamento de histórias de usuário
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.href}
              className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div>
                <div className={`absolute ${stat.color} rounded-md p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="ml-16 text-sm font-medium text-gray-500 truncate">
                  {stat.name}
                </p>
                <p className="ml-16 text-2xl font-semibold text-gray-900">
                  {stat.value}
                </p>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <span className="text-orange-600 font-medium hover:text-orange-500">
                    Ver todos
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/teams/new"
            className="relative rounded-lg border-2 border-dashed border-orange-200 p-6 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            <div className="text-center">
              <Plus className="mx-auto h-8 w-8 text-orange-400" />
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Novo Time
              </span>
            </div>
          </Link>
          <Link
            to="/clients/new"
            className="relative rounded-lg border-2 border-dashed border-orange-200 p-6 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            <div className="text-center">
              <Plus className="mx-auto h-8 w-8 text-orange-400" />
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Novo Cliente
              </span>
            </div>
          </Link>
          <Link
            to="/projects/new"
            className="relative rounded-lg border-2 border-dashed border-orange-200 p-6 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            <div className="text-center">
              <Plus className="mx-auto h-8 w-8 text-orange-400" />
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Novo Projeto
              </span>
            </div>
          </Link>
          <Link
            to="/stories/new"
            className="relative rounded-lg border-2 border-dashed border-orange-200 p-6 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            <div className="text-center">
              <Plus className="mx-auto h-8 w-8 text-orange-400" />
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Nova História
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Projects */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Projetos Recentes
            </h3>
            {recentProjects.length > 0 ? (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div>
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-sm font-medium text-orange-600 hover:text-orange-500"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-gray-500">{project.description}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      project.status === 'active' ? 'bg-green-100 text-green-800' :
                      project.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                      project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhum projeto cadastrado ainda.</p>
            )}
          </div>
        </div>

        {/* Recent Stories */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Histórias Recentes
            </h3>
            {recentStories.length > 0 ? (
              <div className="space-y-3">
                {recentStories.map((story) => {
                  const project = projects.find(p => p.id === story.projectId);
                  return (
                    <div key={story.id} className="flex items-center justify-between">
                      <div>
                        <Link
                          to={`/stories/${story.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                          {story.id}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {project?.name || 'Projeto não encontrado'}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        story.status === 'done' ? 'bg-green-100 text-green-800' :
                        story.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                       story.status === 'in-review' ? 'bg-purple-100 text-purple-800' :
                        story.status === 'ready' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                       {story.status === 'done' ? 'Finalizado' :
                        story.status === 'in-progress' ? 'Em Andamento' :
                        story.status === 'in-review' ? 'Em Revisão' :
                        story.status === 'ready' ? 'Pronta' :
                        story.status === 'draft' ? 'Rascunho' :
                        story.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhuma história cadastrada ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;