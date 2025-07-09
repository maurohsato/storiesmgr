import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Team, Client, Project, UserStoryData } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const useSupabaseData = () => {
  const [teams, setTeamsState] = useLocalStorage<Team[]>('teams', []);
  const [clients, setClientsState] = useLocalStorage<Client[]>('clients', []);
  const [projects, setProjectsState] = useLocalStorage<Project[]>('projects', []);
  const [userStories, setUserStoriesState] = useLocalStorage<UserStoryData[]>('userStories', []);
  const [loading, setLoading] = useState(false);

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoading(false);
  };

  // Team operations
  const createTeam = async (team: Omit<Team, 'id' | 'createdAt'>) => {
    const newTeam: Team = {
      id: uuidv4(),
      ...team,
      createdAt: new Date().toISOString(),
    };
    setTeamsState(prev => [...prev, newTeam]);
    return newTeam;
  };

  const updateTeam = async (id: string, updates: Partial<Team>) => {
    const updatedTeam = teams.find(t => t.id === id);
    if (!updatedTeam) throw new Error('Team not found');
    
    const newTeam = { ...updatedTeam, ...updates };
    setTeamsState(prev => prev.map(team => team.id === id ? newTeam : team));
    return newTeam;
  };

  const deleteTeam = async (id: string) => {
    setTeamsState(prev => prev.filter(team => team.id !== id));
  };

  // Client operations
  const createClient = async (client: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      id: uuidv4(),
      ...client,
      createdAt: new Date().toISOString(),
    };
    setClientsState(prev => [...prev, newClient]);
    return newClient;
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const updatedClient = clients.find(c => c.id === id);
    if (!updatedClient) throw new Error('Client not found');
    
    const newClient = { ...updatedClient, ...updates };
    setClientsState(prev => prev.map(client => client.id === id ? newClient : client));
    return newClient;
  };

  const deleteClient = async (id: string) => {
    setClientsState(prev => prev.filter(client => client.id !== id));
  };

  // Project operations
  const createProject = async (project: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      id: uuidv4(),
      ...project,
      createdAt: new Date().toISOString(),
    };
    setProjectsState(prev => [...prev, newProject]);
    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const updatedProject = projects.find(p => p.id === id);
    if (!updatedProject) throw new Error('Project not found');
    
    const newProject = { ...updatedProject, ...updates };
    setProjectsState(prev => prev.map(project => project.id === id ? newProject : project));
    return newProject;
  };

  const deleteProject = async (id: string) => {
    setProjectsState(prev => prev.filter(project => project.id !== id));
  };

  // User Story operations
  const createUserStory = async (story: Omit<UserStoryData, 'createdAt'>) => {
    const newStory: UserStoryData = {
      ...story,
      createdAt: new Date().toISOString(),
    };
    setUserStoriesState(prev => [...prev, newStory]);
    return newStory;
  };

  const updateUserStory = async (id: string, updates: Partial<UserStoryData>) => {
    const updatedStory = userStories.find(s => s.id === id);
    if (!updatedStory) throw new Error('User story not found');
    
    const newStory = { ...updatedStory, ...updates };
    setUserStoriesState(prev => prev.map(story => story.id === id ? newStory : story));
    return newStory;
  };

  const deleteUserStory = async (id: string) => {
    setUserStoriesState(prev => prev.filter(story => story.id !== id));
  };

  return {
    // Data
    teams,
    clients,
    projects,
    userStories,
    loading,
    
    // Operations
    createTeam,
    updateTeam,
    deleteTeam,
    createClient,
    updateClient,
    deleteClient,
    createProject,
    updateProject,
    deleteProject,
    createUserStory,
    updateUserStory,
    deleteUserStory,
    
    // Refresh
    loadAllData,
  };
};