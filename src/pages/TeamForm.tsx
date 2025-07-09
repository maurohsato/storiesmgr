import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { v4 as uuidv4 } from 'uuid';
import { Team } from '../types';
import { ArrowLeft, Plus, X } from 'lucide-react';

const TeamForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { teams, createTeam, updateTeam } = useAppContext();
  const isEditing = Boolean(id);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<Omit<Team, 'id' | 'createdAt'>>({
    name: '',
    description: '',
    members: [],
  });

  const [newMember, setNewMember] = useState('');

  useEffect(() => {
    if (isEditing && id) {
      const team = teams.find(t => t.id === id);
      if (team) {
        setFormData({
          name: team.name,
          description: team.description,
          members: team.members,
        });
      }
    }
  }, [isEditing, id, teams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (isEditing && id) {
        await updateTeam(id, formData);
      } else {
        await createTeam(formData);
      }
      navigate('/teams');
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Erro ao salvar time. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const addMember = () => {
    if (newMember.trim() && !formData.members.includes(newMember.trim())) {
      setFormData(prev => ({
        ...prev,
        members: [...prev.members, newMember.trim()]
      }));
      setNewMember('');
    }
  };

  const removeMember = (memberToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(member => member !== memberToRemove)
    }));
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/teams')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para Times
        </button>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">
              {isEditing ? 'Editar Time' : 'Novo Time'}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome do Time *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Membros do Time
                </label>
                
                <div className="flex space-x-2 mb-3">
                  <input
                    type="text"
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                    placeholder="Nome do membro"
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMember())}
                  />
                  <button
                    type="button"
                    onClick={addMember}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {formData.members.length > 0 && (
                  <div className="space-y-2">
                    {formData.members.map((member, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                        <span className="text-sm text-gray-900">{member}</span>
                        <button
                          type="button"
                          onClick={() => removeMember(member)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/teams')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {submitting ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar')} Time
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamForm;