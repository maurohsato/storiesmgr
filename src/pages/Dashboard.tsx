import React from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { Users, Building2, FolderOpen, FileText, Plus, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { teams, clients, projects, userStories } = useAppContext();
  const { profile } = useAuth();

  // Show restricted message for readers
  if (profile?.role === 'reader') {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-yellow-900 mb-4">
              Bem-vindo ao Sistema de Histórias de Usuário
            </h1>
            <p className="text-yellow-800 mb-6">
              Sua conta foi criada com sucesso, mas ainda está aguardando aprovação do administrador.
            </p>
            <div className="bg-white border border-yellow-300 rounded-md p-4 text-left">
              <h3 className="font-medium text-yellow-900 mb-2">📋 Próximos passos:</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Entre em contato com <strong>admin@demo.com</strong></li>
                <li>• Solicite as permissões necessárias para sua função</li>
                <li>• Aguarde a aprovação da sua conta</li>
                <li>• Após aprovação, você terá acesso às funcionalidades</li>
              </ul>
            </div>
            <div className="mt-6 text-sm text-yellow-700">
              <p><strong>Seu perfil atual:</strong> Leitor (Acesso Restrito)</p>
              <p><strong>Email:</strong> {profile.email}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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