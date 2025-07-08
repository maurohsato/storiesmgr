import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Edit, Plus, FileText, Calendar, Users, Building2 } from 'lucide-react';

const ProjectDetail: React.FC = () => {
  const { id } = useParams();
  const { projects, clients, teams, userStories } = useAppContext();

  const project = projects.find(p => p.id === id);
  const client = project ? clients.find(c => c.id === project.clientId) : null;
  const team = project ? teams.find(t => t.id === project.teamId) : null;
  const projectStories = userStories.filter(story => story.projectId === id);

  if (!project) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">Projeto não encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            O projeto que você está procurando não existe.
          </p>
          <div className="mt-6">
            <Link
              to="/projects"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Voltar para Projetos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'planning':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'planning':
        return 'Planejamento';
      case 'completed':
        return 'Concluído';
      case 'paused':
        return 'Pausado';
      default:
        return status;
    }
  };

  const getStoryStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'in-review':
        return 'bg-purple-100 text-purple-800';
      case 'ready':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStoryStatusLabel = (status: string) => {
    switch (status) {
      case 'done':
        return 'Finalizado';
      case 'in-progress':
        return 'Em Andamento';
      case 'in-review':
        return 'Em Revisão';
      case 'ready':
        return 'Pronta';
      case 'draft':
        return 'Rascunho';
      default:
        return status;
    }
  };

  // Group stories by status for better visualization
  const storiesByStatus = {
    draft: projectStories.filter(s => s.status === 'draft'),
    ready: projectStories.filter(s => s.status === 'ready'),
    'in-progress': projectStories.filter(s => s.status === 'in-progress'),
    'in-review': projectStories.filter(s => s.status === 'in-review'),
    done: projectStories.filter(s => s.status === 'done'),
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Project Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                  <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                <p className="mt-2 text-gray-600">{project.description}</p>
              </div>
              <div className="ml-6">
                <Link
                  to={`/projects/${project.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Projeto
                </Link>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center">
                <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Cliente</p>
                  <p className="text-sm text-gray-600">{client?.companyName || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Users className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Time</p>
                  <p className="text-sm text-gray-600">{team?.name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Duração</p>
                  <p className="text-sm text-gray-600">{project.duration}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Início</p>
                  <p className="text-sm text-gray-600">
                    {new Date(project.startDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {project.technologies.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-900 mb-2">Tecnologias</p>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {project.internalNotes && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-900 mb-2">Observações Internas</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  {project.internalNotes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User Stories Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                Histórias de Usuário ({projectStories.length})
              </h2>
              <Link
                to={`/stories/new?projectId=${project.id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova História
              </Link>
            </div>

            {projectStories.length > 0 ? (
              <div className="space-y-6">
                {/* Stories Summary */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-600">{storiesByStatus.draft.length}</div>
                    <div className="text-sm text-gray-500">Rascunhos</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">{storiesByStatus.ready.length}</div>
                    <div className="text-sm text-yellow-600">Prontas</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{storiesByStatus['in-progress'].length}</div>
                    <div className="text-sm text-blue-600">Em Andamento</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{storiesByStatus['in-review'].length}</div>
                    <div className="text-sm text-purple-600">Em Revisão</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{storiesByStatus.done.length}</div>
                    <div className="text-sm text-green-600">Finalizadas</div>
                  </div>
                </div>

                {/* Stories List */}
                <div className="space-y-4">
                  {projectStories.map((story) => (
                    <div
                      key={story.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-orange-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-orange-500 mr-2" />
                            <Link
                              to={`/stories/${story.id}/edit`}
                              className="text-sm font-medium text-orange-600 hover:text-orange-500"
                            >
                              {story.id}
                            </Link>
                            <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStoryStatusColor(story.status)}`}>
                              {getStoryStatusLabel(story.status)}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <p className="text-sm text-gray-600 line-clamp-2">
                              <span className="font-medium text-orange-700">Desejo:</span> {story.userDesire}
                            </p>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              <span className="font-medium text-orange-700">Importância:</span> {story.userImportance}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium text-orange-700">Autor:</span> {story.author}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Criada em {new Date(story.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="ml-4">
                          <Link
                            to={`/stories/${story.id}/edit`}
                            className="inline-flex items-center px-3 py-1.5 border border-orange-300 shadow-sm text-xs font-medium rounded text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma história cadastrada</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comece criando uma nova história de usuário para este projeto.
                </p>
                <div className="mt-6">
                  <Link
                    to={`/stories/new?projectId=${project.id}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova História
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;