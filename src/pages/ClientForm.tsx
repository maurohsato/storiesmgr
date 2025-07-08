import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { v4 as uuidv4 } from 'uuid';
import { Client, Collaborator } from '../types';
import { ArrowLeft, Plus, X } from 'lucide-react';

const ClientForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { clients, setClients } = useAppContext();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<Omit<Client, 'id' | 'createdAt'>>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    collaborators: [],
  });

  const [newCollaborator, setNewCollaborator] = useState<Omit<Collaborator, 'id'>>({
    name: '',
    email: '',
    role: '',
    phone: '',
  });

  useEffect(() => {
    if (isEditing && id) {
      const client = clients.find(c => c.id === id);
      if (client) {
        setFormData({
          companyName: client.companyName,
          contactPerson: client.contactPerson,
          email: client.email,
          phone: client.phone,
          address: client.address,
          collaborators: client.collaborators,
        });
      }
    }
  }, [isEditing, id, clients]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && id) {
      setClients(prev => prev.map(client => 
        client.id === id 
          ? { ...client, ...formData }
          : client
      ));
    } else {
      const newClient: Client = {
        id: uuidv4(),
        ...formData,
        createdAt: new Date().toISOString(),
      };
      setClients(prev => [...prev, newClient]);
    }
    
    navigate('/clients');
  };

  const addCollaborator = () => {
    if (newCollaborator.name.trim() && newCollaborator.email.trim()) {
      const collaborator: Collaborator = {
        id: uuidv4(),
        ...newCollaborator,
      };
      setFormData(prev => ({
        ...prev,
        collaborators: [...prev.collaborators, collaborator]
      }));
      setNewCollaborator({
        name: '',
        email: '',
        role: '',
        phone: '',
      });
    }
  };

  const removeCollaborator = (collaboratorId: string) => {
    setFormData(prev => ({
      ...prev,
      collaborators: prev.collaborators.filter(collab => collab.id !== collaboratorId)
    }));
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para Clientes
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">
              {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">
                    Pessoa de Contato *
                  </label>
                  <input
                    type="text"
                    id="contactPerson"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Endereço
                </label>
                <textarea
                  id="address"
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Colaboradores
                </label>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Adicionar Colaborador</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Nome *"
                      value={newCollaborator.name}
                      onChange={(e) => setNewCollaborator(prev => ({ ...prev, name: e.target.value }))}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="Email *"
                      value={newCollaborator.email}
                      onChange={(e) => setNewCollaborator(prev => ({ ...prev, email: e.target.value }))}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Cargo"
                      value={newCollaborator.role}
                      onChange={(e) => setNewCollaborator(prev => ({ ...prev, role: e.target.value }))}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="flex space-x-2">
                      <input
                        type="tel"
                        placeholder="Telefone"
                        value={newCollaborator.phone}
                        onChange={(e) => setNewCollaborator(prev => ({ ...prev, phone: e.target.value }))}
                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addCollaborator}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {formData.collaborators.length > 0 && (
                  <div className="space-y-3">
                    {formData.collaborators.map((collaborator) => (
                      <div key={collaborator.id} className="flex items-center justify-between bg-white border border-gray-200 px-4 py-3 rounded-md">
                        <div className="flex-1 grid grid-cols-1 gap-2 sm:grid-cols-4">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{collaborator.name}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">{collaborator.email}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">{collaborator.role}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">{collaborator.phone}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCollaborator(collaborator.id)}
                          className="ml-4 text-red-600 hover:text-red-800"
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
                  onClick={() => navigate('/clients')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isEditing ? 'Atualizar' : 'Criar'} Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientForm;