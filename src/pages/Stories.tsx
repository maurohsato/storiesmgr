import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plus, FileText, Edit, Trash2, Filter } from 'lucide-react';

const Stories: React.FC = () => {
  const { userStories, setUserStories, projects } = useAppContext();
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const handleDelete = (storyId: string) => {
    setUserStories(prev => prev.filter(story => story.id !== storyId));
    setShowDeleteModal(null);
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Projeto não encontrado';
  };

  const getStatusColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
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

  const filteredStories = userStories.filter(story => {
    const matchesProject = !filterProject || story.projectId === filterProject;
    const matchesStatus = !filterStatus || story.status === filterStatus;
    return matchesProject && matchesStatus;
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Histórias de Usuário</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gerencie todas as histórias de usuário dos seus projetos
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/stories/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova História
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="filterProject" className="block text-sm font-medium text-gray-700">
                Filtrar por Projeto
              </label>
              <select
                id="filterProject"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Todos os projetos</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700">
                Filtrar por Status
              </label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Todos os status</option>
                <option value="draft">Rascunho</option>
                <option value="ready">Pronta</option>
                <option value="in-progress">Em Andamento</option>
                <option value="in-review">Em Revisão</option>
                <option value="done">Finalizado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            {filteredStories.length > 0 ? (
              <div className="space-y-4">
                {filteredStories.map((story) => (
                  <div
                    key={story.id}
                    className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <FileText className="h-8 w-8 text-orange-500" />
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex items-center">
                              <Link
                                to={`/stories/${story.id}/edit`}
                                className="text-lg font-medium text-gray-900 hover:text-blue-600"
                              >
                                {story.id}
                              </Link>
                              <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(story.status)}`}>
                                {getStatusLabel(story.status)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {getProjectName(story.projectId)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          <span className="font-medium">Desejo do usuário:</span> {story.userDesire}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          <span className="font-medium">Importância:</span> {story.userImportance}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                        <div>
                          <span>Criada por {story.author} em {new Date(story.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            to={`/stories/${story.id}/edit`}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Link>
                          <button
                            onClick={() => setShowDeleteModal(story.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {userStories.length === 0 ? 'Nenhuma história cadastrada' : 'Nenhuma história encontrada'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {userStories.length === 0 
                    ? 'Comece criando uma nova história de usuário.'
                    : 'Tente ajustar os filtros para encontrar as histórias desejadas.'
                  }
                </p>
                <div className="mt-6">
                  <Link
                    to="/stories/new"
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

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">Confirmar exclusão</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Tem certeza que deseja excluir esta história? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex justify-center space-x-4 px-4 py-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(showDeleteModal)}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stories;