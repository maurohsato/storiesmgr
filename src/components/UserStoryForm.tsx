import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Save, FileText, Send, ChevronLeft, ChevronRight, User, Target, Route, Shield, Code, MessageSquare, Calendar, ArrowLeft, Edit, Eye } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { v4 as uuidv4 } from 'uuid';
import { UserStoryData } from '../types';
import FormSection from './FormSection';
import FormField from './FormField';
import ProgressBar from './ProgressBar';
import ActionButtons from './ActionButtons';
import StatusSelector from './StatusSelector';
import { generateUserStoryPDF } from '../utils/pdfGenerator';

const UserStoryForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { projects, teams, userStories, setUserStories } = useAppContext();
  
  const projectId = searchParams.get('projectId') || '';
  const isEditing = Boolean(id);
  
  const [formData, setFormData] = useState<Omit<UserStoryData, 'createdAt'>>({
    id: `US-${Date.now()}`,
    projectId: projectId,
    date: new Date().toISOString().split('T')[0],
    author: '',
    userPersona: '',
    userRole: '',
    userConstraints: '',
    userDesire: '',
    userImportance: '',
    currentProblem: '',
    mainSteps: '',
    alternativeFlows: '',
    businessRules: '',
    validations: '',
    acceptanceCriteria: '',
    dependencies: '',
    technicalRisks: '',
    requiresSpike: '',
    additionalComments: '',
    status: 'draft',
  });

  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Determine view mode based on URL path
  const isViewMode = isEditing && !window.location.pathname.endsWith('/edit');

  // Load existing story for editing
  useEffect(() => {
    if (isEditing && id) {
      const story = userStories.find(s => s.id === id);
      if (story) {
        setFormData({
          id: story.id,
          projectId: story.projectId,
          date: story.date,
          author: story.author,
          userPersona: story.userPersona,
          userRole: story.userRole,
          userConstraints: story.userConstraints,
          userDesire: story.userDesire,
          userImportance: story.userImportance,
          currentProblem: story.currentProblem,
          mainSteps: story.mainSteps,
          alternativeFlows: story.alternativeFlows,
          businessRules: story.businessRules,
          validations: story.validations,
          acceptanceCriteria: story.acceptanceCriteria,
          dependencies: story.dependencies,
          technicalRisks: story.technicalRisks,
          requiresSpike: story.requiresSpike,
          additionalComments: story.additionalComments,
          status: story.status,
        });
      }
    }
  }, [isEditing, id, userStories]);

  // Auto-save to localStorage (only for new stories)
  useEffect(() => {
    if (!isEditing) {
      const savedData = localStorage.getItem('userStoryForm');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setFormData(prev => ({ ...prev, ...parsed }));
      }
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      localStorage.setItem('userStoryForm', JSON.stringify(formData));
    }
  }, [formData, isEditing]);

  const selectedProject = projects.find(p => p.id === formData.projectId);
  const selectedTeam = selectedProject ? teams.find(t => t.id === selectedProject.teamId) : null;

  const handleInputChange = (field: keyof UserStoryData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateProgress = () => {
    const requiredFields = [
      'projectId', 'author', 'userPersona', 'userRole', 'userDesire', 
      'userImportance', 'currentProblem', 'mainSteps', 'acceptanceCriteria'
    ];
    const filledFields = requiredFields.filter(field => formData[field as keyof UserStoryData].trim() !== '');
    return (filledFields.length / requiredFields.length) * 100;
  };

  const handleSave = () => {
    if (!formData.projectId) {
      alert('Por favor, selecione um projeto antes de salvar.');
      return;
    }

    setIsSubmitting(true);
    
    const storyData: UserStoryData = {
      ...formData,
      createdAt: isEditing ? userStories.find(s => s.id === id)?.createdAt || new Date().toISOString() : new Date().toISOString(),
    };
    
    if (isEditing) {
      setUserStories(prev => prev.map(story => 
        story.id === id ? storyData : story
      ));
    } else {
      setUserStories(prev => [...prev, storyData]);
    }
    
    setTimeout(() => {
      setIsSubmitting(false);
      if (!isEditing) {
        localStorage.removeItem('userStoryForm');
      }
      // Navigate back to project detail if we came from there
      if (projectId && !isEditing) {
        navigate(`/projects/${projectId}`);
      } else {
        navigate('/stories');
      }
    }, 1000);
  };

  const handleExportPDF = () => {
    if (!formData.projectId) {
      alert('Por favor, selecione um projeto antes de exportar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const storyData: UserStoryData = {
        ...formData,
        createdAt: isEditing ? userStories.find(s => s.id === id)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      };
      generateUserStoryPDF(storyData);
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setIsSubmitting(false);
      alert(`Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleSendToBacklog = () => {
    if (!formData.projectId) {
      alert('Por favor, selecione um projeto antes de enviar para o backlog.');
      return;
    }

    setIsSubmitting(true);
    
    const storyData: UserStoryData = {
      ...formData,
      createdAt: isEditing ? userStories.find(s => s.id === id)?.createdAt || new Date().toISOString() : new Date().toISOString(),
    };
    
    if (isEditing) {
      setUserStories(prev => prev.map(story => 
        story.id === id ? storyData : story
      ));
    } else {
      setUserStories(prev => [...prev, storyData]);
    }
    
    setTimeout(() => {
      setIsSubmitting(false);
      if (!isEditing) {
        localStorage.removeItem('userStoryForm');
      }
      // Navigate back to project detail if we came from there
      if (projectId && !isEditing) {
        navigate(`/projects/${projectId}`);
      } else {
        navigate('/stories');
      }
    }, 1000);
  };

  const sections = [
    {
      title: 'Identificação da História',
      icon: Calendar,
      fields: [
        { key: 'id', label: 'ID da História', type: 'text', required: true, disabled: true },
        { key: 'date', label: 'Data', type: 'date', required: true },
        { key: 'author', label: 'Nome do autor', type: 'text', required: true },
      ]
    },
    {
      title: 'Sobre o Usuário',
      icon: User,
      fields: [
        { key: 'userPersona', label: 'Quem é o usuário (persona)?', type: 'textarea', required: true },
        { key: 'userRole', label: 'Qual o papel dele no processo?', type: 'textarea', required: true },
        { key: 'userConstraints', label: 'Existem restrições específicas (tecnológicas, físicas, legais)?', type: 'textarea' },
      ]
    },
    {
      title: 'Objetivo da Funcionalidade',
      icon: Target,
      fields: [
        { key: 'userDesire', label: 'O que o usuário deseja fazer?', type: 'textarea', required: true },
        { key: 'userImportance', label: 'Por que isso é importante para ele?', type: 'textarea', required: true },
        { key: 'currentProblem', label: 'O que acontece hoje que está incompleto ou problemático?', type: 'textarea', required: true },
      ]
    },
    {
      title: 'Fluxo Esperado',
      icon: Route,
      fields: [
        { key: 'mainSteps', label: 'Quais são as etapas principais da ação?', type: 'textarea', required: true },
        { key: 'alternativeFlows', label: 'Quais fluxos alternativos ou de erro podem ocorrer?', type: 'textarea' },
      ]
    },
    {
      title: 'Regras e Critérios de Aceitação',
      icon: Shield,
      fields: [
        { key: 'businessRules', label: 'Quais regras de negócio se aplicam?', type: 'textarea' },
        { key: 'validations', label: 'Quais validações ou limites existem?', type: 'textarea' },
        { key: 'acceptanceCriteria', label: 'Quando essa história pode ser considerada "pronta"? (Liste os critérios de aceitação)', type: 'textarea', required: true },
      ]
    },
    {
      title: 'Aspectos Técnicos (opcional)',
      icon: Code,
      fields: [
        { key: 'dependencies', label: 'Há dependências com outras histórias ou sistemas?', type: 'textarea' },
        { key: 'technicalRisks', label: 'Há riscos técnicos envolvidos?', type: 'textarea' },
        { key: 'requiresSpike', label: 'Requer spike técnico ou validação prévia?', type: 'textarea' },
      ]
    },
    {
      title: 'Observações Adicionais',
      icon: MessageSquare,
      fields: [
        { key: 'additionalComments', label: 'Comentários, insights ou anotações relevantes', type: 'textarea' },
      ]
    }
  ];

  const nextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const currentSectionData = sections[currentSection];

  const getBackUrl = () => {
    if (projectId) {
      return `/projects/${projectId}`;
    }
    return '/stories';
  };

  const getBackLabel = () => {
    if (projectId) {
      return 'Voltar para Projeto';
    }
    return 'Voltar para Histórias';
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(getBackUrl())}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {getBackLabel()}
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-800 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">
              {isEditing ? 'Editar História de Usuário' : 'Nova História de Usuário'}
            </h1>
            <p className="text-orange-100 text-lg">Metodologia Ágil</p>
            
            <div className="mt-6">
              <ProgressBar progress={calculateProgress()} />
            </div>
          </div>

          {/* Project Selection */}
          <div className="bg-orange-50 border-b border-orange-200 px-8 py-6">
            <div className="mb-4">
              <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-2">
                Projeto * {!formData.projectId && <span className="text-red-500">(Obrigatório)</span>}
              </label>
              <select
                id="projectId"
                value={formData.projectId}
                onChange={(e) => handleInputChange('projectId', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                required
              >
                <option value="">Selecione um projeto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedProject && (
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-orange-900">Projeto:</span>
                    <span className="ml-2 text-orange-700">{selectedProject.name}</span>
                  </div>
                  {selectedTeam && (
                    <div>
                      <span className="font-medium text-orange-900">Time:</span>
                      <span className="ml-2 text-orange-700">{selectedTeam.name}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-orange-900">Status:</span>
                    <span className="ml-2 text-orange-700">{selectedProject.status}</span>
                  </div>
                  <div>
                    <span className="font-medium text-orange-900">Duração:</span>
                    <span className="ml-2 text-orange-700">{selectedProject.duration}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Status Selection */}
            <div className="mt-6">
              <StatusSelector
                value={formData.status}
                onChange={(value) => {
                  console.log('Status changed to:', value);
                  handleInputChange('status', value);
                }}
                label="Status da História"
                required={true}
                disabled={isViewMode}
              />
              <div className="mt-3 bg-white border border-orange-200 rounded-lg p-3">
                <h4 className="text-xs font-medium text-orange-900 mb-2">Sobre os Status:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-orange-800">
                  <div><strong>Rascunho:</strong> História sendo elaborada</div>
                  <div><strong>Pronta:</strong> Pronta para desenvolvimento</div>
                  <div><strong>Em Andamento:</strong> Sendo desenvolvida</div>
                  <div><strong>Em Revisão:</strong> Em processo de revisão</div>
                  <div><strong>Finalizado:</strong> História finalizada</div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-gray-50 border-b border-gray-200 px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={prevSection}
                    disabled={currentSection === 0}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={20} />
                    <span>Anterior</span>
                  </button>
                  <div className="text-sm text-gray-600">
                    Seção {currentSection + 1} de {sections.length}
                  </div>
                  <button
                    onClick={nextSection}
                    disabled={currentSection === sections.length - 1}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Próxima</span>
                    <ChevronRight size={20} />
                  </button>
                </div>
                
                {/* Edit/View Mode Toggle */}
                {isEditing && (
                  <div className="flex items-center space-x-2">
                    {isViewMode ? (
                      <Link
                        to={`/stories/${id}/edit`}
                        className="inline-flex items-center px-3 py-1.5 border border-orange-300 shadow-sm text-xs font-medium rounded text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar História
                      </Link>
                    ) : (
                      <Link
                        to={`/stories/${id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Visualizar
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-8">
            <FormSection
              title={currentSectionData.title}
              icon={currentSectionData.icon}
              isActive={true}
            >
              <div className="space-y-6">
                {currentSectionData.fields.map((field) => (
                  <div key={field.key}>
                    {field.key === 'id' ? (
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                          <span>{field.label}</span>
                        </label>
                        <input
                          type="text"
                          value={formData[field.key as keyof UserStoryData]}
                          disabled
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-orange-50 text-gray-600 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500">ID gerado automaticamente</p>
                      </div>
                    ) : (
                      <FormField
                        label={field.label}
                        type={field.type}
                        value={formData[field.key as keyof UserStoryData]}
                        onChange={(value) => handleInputChange(field.key as keyof UserStoryData, value)}
                        required={field.required}
                        disabled={isViewMode}
                      />
                    )}
                  </div>
                ))}
              </div>
            </FormSection>
          </div>

          {/* Action Buttons - Only show in edit mode */}
          {!isViewMode && (
            <div className="bg-gray-50 border-t border-gray-200 p-8">
              <ActionButtons
                onSave={handleSave}
                onExportPDF={handleExportPDF}
                onSendToBacklog={handleSendToBacklog}
                isSubmitting={isSubmitting}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserStoryForm;