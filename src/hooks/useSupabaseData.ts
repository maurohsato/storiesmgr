import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { db } from '../lib/supabase';
import { Team, Client, Project, UserStoryData } from '../types';
import { Database } from '../types/database';
import { v4 as uuidv4 } from 'uuid';

// Type mappings between our types and database types
type DbTeam = Database['public']['Tables']['teams']['Row'];
type DbClient = Database['public']['Tables']['clients']['Row'];
type DbProject = Database['public']['Tables']['projects']['Row'];
type DbUserStory = Database['public']['Tables']['user_stories']['Row'];

export const useSupabaseData = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userStories, setUserStories] = useState<UserStoryData[]>([]);
  const [loading, setLoading] = useState(true);

  // Convert database types to our app types
  const convertDbTeam = (dbTeam: DbTeam): Team => ({
    id: dbTeam.id,
    name: dbTeam.name,
    description: dbTeam.description || '',
    members: dbTeam.members || [],
    createdAt: dbTeam.created_at,
  });

  const convertDbClient = (dbClient: DbClient): Client => ({
    id: dbClient.id,
    companyName: dbClient.company_name,
    contactPerson: dbClient.contact_person,
    email: dbClient.email,
    phone: dbClient.phone,
    address: dbClient.address || '',
    collaborators: Array.isArray(dbClient.collaborators) ? dbClient.collaborators as any[] : [],
    createdAt: dbClient.created_at,
  });

  const convertDbProject = (dbProject: DbProject): Project => ({
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description,
    clientId: dbProject.client_id || '',
    teamId: dbProject.team_id || '',
    duration: dbProject.duration,
    technologies: dbProject.technologies || [],
    status: dbProject.status || 'planning',
    startDate: dbProject.start_date,
    endDate: dbProject.end_date || '',
    internalNotes: dbProject.internal_notes || '',
    createdAt: dbProject.created_at,
  });

  const convertDbUserStory = (dbStory: DbUserStory): UserStoryData => ({
    id: dbStory.id,
    projectId: dbStory.project_id || '',
    date: dbStory.date,
    author: dbStory.author,
    userPersona: dbStory.user_persona,
    userRole: dbStory.user_role,
    userConstraints: dbStory.user_constraints || '',
    userDesire: dbStory.user_desire,
    userImportance: dbStory.user_importance,
    currentProblem: dbStory.current_problem,
    mainSteps: dbStory.main_steps,
    alternativeFlows: dbStory.alternative_flows || '',
    businessRules: dbStory.business_rules || '',
    validations: dbStory.validations || '',
    acceptanceCriteria: dbStory.acceptance_criteria,
    dependencies: dbStory.dependencies || '',
    technicalRisks: dbStory.technical_risks || '',
    requiresSpike: dbStory.requires_spike || '',
    additionalComments: dbStory.additional_comments || '',
    status: dbStory.status || 'draft',
    createdAt: dbStory.created_at,
  });

  // Load all data from Supabase
  const loadAllData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load teams
      const teamsData = await db.getTeams();
      setTeams(teamsData.map(convertDbTeam));

      // Load clients
      const clientsData = await db.getClients();
      setClients(clientsData.map(convertDbClient));

      // Load projects
      const projectsData = await db.getProjects();
      setProjects(projectsData.map(convertDbProject));

      // Load user stories
      const storiesData = await db.getUserStories();
      setUserStories(storiesData.map(convertDbUserStory));
    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to localStorage if Supabase fails
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  // Fallback to localStorage
  const loadFromLocalStorage = () => {
    try {
      const savedTeams = localStorage.getItem('teams');
      const savedClients = localStorage.getItem('clients');
      const savedProjects = localStorage.getItem('projects');
      const savedStories = localStorage.getItem('userStories');

      if (savedTeams) setTeams(JSON.parse(savedTeams));
      if (savedClients) setClients(JSON.parse(savedClients));
      if (savedProjects) setProjects(JSON.parse(savedProjects));
      if (savedStories) setUserStories(JSON.parse(savedStories));
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  };

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadAllData();
    } else {
      // Clear data when user logs out
      setTeams([]);
      setClients([]);
      setProjects([]);
      setUserStories([]);
      setLoading(false);
    }
  }, [user]);

  // Team operations
  const createTeam = async (team: Omit<Team, 'id' | 'createdAt'>) => {
    try {
      const dbTeam = await db.createTeam({
        name: team.name,
        description: team.description,
        members: team.members,
      });
      const newTeam = convertDbTeam(dbTeam);
      setTeams(prev => [...prev, newTeam]);
      return newTeam;
    } catch (error) {
      console.error('Error creating team:', error);
      // Fallback to localStorage
      const newTeam: Team = {
        id: uuidv4(),
        ...team,
        createdAt: new Date().toISOString(),
      };
      setTeams(prev => {
        const updated = [...prev, newTeam];
        localStorage.setItem('teams', JSON.stringify(updated));
        return updated;
      });
      return newTeam;
    }
  };

  const updateTeam = async (id: string, updates: Partial<Team>) => {
    try {
      const dbUpdates: Database['public']['Tables']['teams']['Update'] = {
        name: updates.name,
        description: updates.description,
        members: updates.members,
      };
      const dbTeam = await db.updateTeam(id, dbUpdates);
      const updatedTeam = convertDbTeam(dbTeam);
      setTeams(prev => prev.map(team => team.id === id ? updatedTeam : team));
      return updatedTeam;
    } catch (error) {
      console.error('Error updating team:', error);
      // Fallback to localStorage
      const updatedTeam = teams.find(t => t.id === id);
      if (!updatedTeam) throw new Error('Team not found');
      
      const newTeam = { ...updatedTeam, ...updates };
      setTeams(prev => {
        const updated = prev.map(team => team.id === id ? newTeam : team);
        localStorage.setItem('teams', JSON.stringify(updated));
        return updated;
      });
      return newTeam;
    }
  };

  const deleteTeam = async (id: string) => {
    try {
      await db.deleteTeam(id);
      setTeams(prev => prev.filter(team => team.id !== id));
    } catch (error) {
      console.error('Error deleting team:', error);
      // Fallback to localStorage
      setTeams(prev => {
        const updated = prev.filter(team => team.id !== id);
        localStorage.setItem('teams', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Client operations
  const createClient = async (client: Omit<Client, 'id' | 'createdAt'>) => {
    try {
      const dbClient = await db.createClient({
        company_name: client.companyName,
        contact_person: client.contactPerson,
        email: client.email,
        phone: client.phone,
        address: client.address,
        collaborators: client.collaborators as any,
      });
      const newClient = convertDbClient(dbClient);
      setClients(prev => [...prev, newClient]);
      return newClient;
    } catch (error) {
      console.error('Error creating client:', error);
      // Fallback to localStorage
      const newClient: Client = {
        id: uuidv4(),
        ...client,
        createdAt: new Date().toISOString(),
      };
      setClients(prev => {
        const updated = [...prev, newClient];
        localStorage.setItem('clients', JSON.stringify(updated));
        return updated;
      });
      return newClient;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const dbUpdates: Database['public']['Tables']['clients']['Update'] = {
        company_name: updates.companyName,
        contact_person: updates.contactPerson,
        email: updates.email,
        phone: updates.phone,
        address: updates.address,
        collaborators: updates.collaborators as any,
      };
      const dbClient = await db.updateClient(id, dbUpdates);
      const updatedClient = convertDbClient(dbClient);
      setClients(prev => prev.map(client => client.id === id ? updatedClient : client));
      return updatedClient;
    } catch (error) {
      console.error('Error updating client:', error);
      // Fallback to localStorage
      const updatedClient = clients.find(c => c.id === id);
      if (!updatedClient) throw new Error('Client not found');
      
      const newClient = { ...updatedClient, ...updates };
      setClients(prev => {
        const updated = prev.map(client => client.id === id ? newClient : client);
        localStorage.setItem('clients', JSON.stringify(updated));
        return updated;
      });
      return newClient;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await db.deleteClient(id);
      setClients(prev => prev.filter(client => client.id !== id));
    } catch (error) {
      console.error('Error deleting client:', error);
      // Fallback to localStorage
      setClients(prev => {
        const updated = prev.filter(client => client.id !== id);
        localStorage.setItem('clients', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Project operations
  const createProject = async (project: Omit<Project, 'id' | 'createdAt'>) => {
    try {
      const dbProject = await db.createProject({
        name: project.name,
        description: project.description,
        client_id: project.clientId || null,
        team_id: project.teamId || null,
        duration: project.duration,
        technologies: project.technologies,
        status: project.status,
        start_date: project.startDate,
        end_date: project.endDate || null,
        internal_notes: project.internalNotes,
      });
      const newProject = convertDbProject(dbProject);
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      // Fallback to localStorage
      const newProject: Project = {
        id: uuidv4(),
        ...project,
        createdAt: new Date().toISOString(),
      };
      setProjects(prev => {
        const updated = [...prev, newProject];
        localStorage.setItem('projects', JSON.stringify(updated));
        return updated;
      });
      return newProject;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const dbUpdates: Database['public']['Tables']['projects']['Update'] = {
        name: updates.name,
        description: updates.description,
        client_id: updates.clientId || null,
        team_id: updates.teamId || null,
        duration: updates.duration,
        technologies: updates.technologies,
        status: updates.status,
        start_date: updates.startDate,
        end_date: updates.endDate || null,
        internal_notes: updates.internalNotes,
      };
      const dbProject = await db.updateProject(id, dbUpdates);
      const updatedProject = convertDbProject(dbProject);
      setProjects(prev => prev.map(project => project.id === id ? updatedProject : project));
      return updatedProject;
    } catch (error) {
      console.error('Error updating project:', error);
      // Fallback to localStorage
      const updatedProject = projects.find(p => p.id === id);
      if (!updatedProject) throw new Error('Project not found');
      
      const newProject = { ...updatedProject, ...updates };
      setProjects(prev => {
        const updated = prev.map(project => project.id === id ? newProject : project);
        localStorage.setItem('projects', JSON.stringify(updated));
        return updated;
      });
      return newProject;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await db.deleteProject(id);
      setProjects(prev => prev.filter(project => project.id !== id));
    } catch (error) {
      console.error('Error deleting project:', error);
      // Fallback to localStorage
      setProjects(prev => {
        const updated = prev.filter(project => project.id !== id);
        localStorage.setItem('projects', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // User Story operations
  const createUserStory = async (story: Omit<UserStoryData, 'createdAt'>) => {
    try {
      const dbStory = await db.createUserStory({
        id: story.id,
        project_id: story.projectId || null,
        date: story.date,
        author: story.author,
        user_persona: story.userPersona,
        user_role: story.userRole,
        user_constraints: story.userConstraints,
        user_desire: story.userDesire,
        user_importance: story.userImportance,
        current_problem: story.currentProblem,
        main_steps: story.mainSteps,
        alternative_flows: story.alternativeFlows,
        business_rules: story.businessRules,
        validations: story.validations,
        acceptance_criteria: story.acceptanceCriteria,
        dependencies: story.dependencies,
        technical_risks: story.technicalRisks,
        requires_spike: story.requiresSpike,
        additional_comments: story.additionalComments,
        status: story.status,
      });
      const newStory = convertDbUserStory(dbStory);
      setUserStories(prev => [...prev, newStory]);
      return newStory;
    } catch (error) {
      console.error('Error creating user story:', error);
      // Fallback to localStorage
      const newStory: UserStoryData = {
        ...story,
        createdAt: new Date().toISOString(),
      };
      setUserStories(prev => {
        const updated = [...prev, newStory];
        localStorage.setItem('userStories', JSON.stringify(updated));
        return updated;
      });
      return newStory;
    }
  };

  const updateUserStory = async (id: string, updates: Partial<UserStoryData>) => {
    try {
      const dbUpdates: Database['public']['Tables']['user_stories']['Update'] = {
        project_id: updates.projectId || null,
        date: updates.date,
        author: updates.author,
        user_persona: updates.userPersona,
        user_role: updates.userRole,
        user_constraints: updates.userConstraints,
        user_desire: updates.userDesire,
        user_importance: updates.userImportance,
        current_problem: updates.currentProblem,
        main_steps: updates.mainSteps,
        alternative_flows: updates.alternativeFlows,
        business_rules: updates.businessRules,
        validations: updates.validations,
        acceptance_criteria: updates.acceptanceCriteria,
        dependencies: updates.dependencies,
        technical_risks: updates.technicalRisks,
        requires_spike: updates.requiresSpike,
        additional_comments: updates.additionalComments,
        status: updates.status,
      };
      const dbStory = await db.updateUserStory(id, dbUpdates);
      const updatedStory = convertDbUserStory(dbStory);
      setUserStories(prev => prev.map(story => story.id === id ? updatedStory : story));
      return updatedStory;
    } catch (error) {
      console.error('Error updating user story:', error);
      // Fallback to localStorage
      const updatedStory = userStories.find(s => s.id === id);
      if (!updatedStory) throw new Error('User story not found');
      
      const newStory = { ...updatedStory, ...updates };
      setUserStories(prev => {
        const updated = prev.map(story => story.id === id ? newStory : story);
        localStorage.setItem('userStories', JSON.stringify(updated));
        return updated;
      });
      return newStory;
    }
  };

  const deleteUserStory = async (id: string) => {
    try {
      await db.deleteUserStory(id);
      setUserStories(prev => prev.filter(story => story.id !== id));
    } catch (error) {
      console.error('Error deleting user story:', error);
      // Fallback to localStorage
      setUserStories(prev => {
        const updated = prev.filter(story => story.id !== id);
        localStorage.setItem('userStories', JSON.stringify(updated));
        return updated;
      });
    }
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