import { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { Database } from '../types/database';
import { Team, Client, Project, UserStoryData } from '../types';

type DbTeam = Database['public']['Tables']['teams']['Row'];
type DbClient = Database['public']['Tables']['clients']['Row'];
type DbProject = Database['public']['Tables']['projects']['Row'];
type DbUserStory = Database['public']['Tables']['user_stories']['Row'];

// Helper functions to convert between database and app types
const convertDbTeamToApp = (dbTeam: DbTeam): Team => ({
  id: dbTeam.id,
  name: dbTeam.name,
  description: dbTeam.description || '',
  members: dbTeam.members || [],
  createdAt: dbTeam.created_at,
});

const convertDbClientToApp = (dbClient: DbClient): Client => ({
  id: dbClient.id,
  companyName: dbClient.company_name,
  contactPerson: dbClient.contact_person,
  email: dbClient.email,
  phone: dbClient.phone,
  address: dbClient.address || '',
  collaborators: Array.isArray(dbClient.collaborators) ? dbClient.collaborators as any[] : [],
  createdAt: dbClient.created_at,
});

const convertDbProjectToApp = (dbProject: DbProject): Project => ({
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

const convertDbUserStoryToApp = (dbStory: DbUserStory): UserStoryData => ({
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

export const useSupabaseData = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userStories, setUserStories] = useState<UserStoryData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTeams(),
        loadClients(),
        loadProjects(),
        loadUserStories(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const data = await db.getTeams();
      setTeams(data.map(convertDbTeamToApp));
    } catch (error) {
      console.error('Error loading teams:', error);
      // Fallback to localStorage for demo
      const localTeams = localStorage.getItem('teams');
      if (localTeams) {
        setTeams(JSON.parse(localTeams));
      }
    }
  };

  const loadClients = async () => {
    try {
      const data = await db.getClients();
      setClients(data.map(convertDbClientToApp));
    } catch (error) {
      console.error('Error loading clients:', error);
      // Fallback to localStorage for demo
      const localClients = localStorage.getItem('clients');
      if (localClients) {
        setClients(JSON.parse(localClients));
      }
    }
  };

  const loadProjects = async () => {
    try {
      const data = await db.getProjects();
      setProjects(data.map(convertDbProjectToApp));
    } catch (error) {
      console.error('Error loading projects:', error);
      // Fallback to localStorage for demo
      const localProjects = localStorage.getItem('projects');
      if (localProjects) {
        setProjects(JSON.parse(localProjects));
      }
    }
  };

  const loadUserStories = async () => {
    try {
      const data = await db.getUserStories();
      setUserStories(data.map(convertDbUserStoryToApp));
    } catch (error) {
      console.error('Error loading user stories:', error);
      // Fallback to localStorage for demo
      const localStories = localStorage.getItem('userStories');
      if (localStories) {
        setUserStories(JSON.parse(localStories));
      }
    }
  };

  // Team operations
  const createTeam = async (team: Omit<Team, 'id' | 'createdAt'>) => {
    try {
      const dbTeam = await db.createTeam({
        name: team.name,
        description: team.description,
        members: team.members,
      });
      const newTeam = convertDbTeamToApp(dbTeam);
      setTeams(prev => [...prev, newTeam]);
      return newTeam;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  };

  const updateTeam = async (id: string, updates: Partial<Team>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.members) dbUpdates.members = updates.members;

      const dbTeam = await db.updateTeam(id, dbUpdates);
      const updatedTeam = convertDbTeamToApp(dbTeam);
      setTeams(prev => prev.map(team => team.id === id ? updatedTeam : team));
      return updatedTeam;
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  };

  const deleteTeam = async (id: string) => {
    try {
      await db.deleteTeam(id);
      setTeams(prev => prev.filter(team => team.id !== id));
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
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
      const newClient = convertDbClientToApp(dbClient);
      setClients(prev => [...prev, newClient]);
      return newClient;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const dbUpdates: any = {};
      if (updates.companyName) dbUpdates.company_name = updates.companyName;
      if (updates.contactPerson) dbUpdates.contact_person = updates.contactPerson;
      if (updates.email) dbUpdates.email = updates.email;
      if (updates.phone) dbUpdates.phone = updates.phone;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.collaborators) dbUpdates.collaborators = updates.collaborators;

      const dbClient = await db.updateClient(id, dbUpdates);
      const updatedClient = convertDbClientToApp(dbClient);
      setClients(prev => prev.map(client => client.id === id ? updatedClient : client));
      return updatedClient;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await db.deleteClient(id);
      setClients(prev => prev.filter(client => client.id !== id));
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
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
      const newProject = convertDbProjectToApp(dbProject);
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.description) dbUpdates.description = updates.description;
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId || null;
      if (updates.teamId !== undefined) dbUpdates.team_id = updates.teamId || null;
      if (updates.duration) dbUpdates.duration = updates.duration;
      if (updates.technologies) dbUpdates.technologies = updates.technologies;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.startDate) dbUpdates.start_date = updates.startDate;
      if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate || null;
      if (updates.internalNotes !== undefined) dbUpdates.internal_notes = updates.internalNotes;

      const dbProject = await db.updateProject(id, dbUpdates);
      const updatedProject = convertDbProjectToApp(dbProject);
      setProjects(prev => prev.map(project => project.id === id ? updatedProject : project));
      return updatedProject;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await db.deleteProject(id);
      setProjects(prev => prev.filter(project => project.id !== id));
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
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
      const newStory = convertDbUserStoryToApp(dbStory);
      setUserStories(prev => [...prev, newStory]);
      return newStory;
    } catch (error) {
      console.error('Error creating user story:', error);
      throw error;
    }
  };

  const updateUserStory = async (id: string, updates: Partial<UserStoryData>) => {
    try {
      const dbUpdates: any = {};
      if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId || null;
      if (updates.date) dbUpdates.date = updates.date;
      if (updates.author) dbUpdates.author = updates.author;
      if (updates.userPersona) dbUpdates.user_persona = updates.userPersona;
      if (updates.userRole) dbUpdates.user_role = updates.userRole;
      if (updates.userConstraints !== undefined) dbUpdates.user_constraints = updates.userConstraints;
      if (updates.userDesire) dbUpdates.user_desire = updates.userDesire;
      if (updates.userImportance) dbUpdates.user_importance = updates.userImportance;
      if (updates.currentProblem) dbUpdates.current_problem = updates.currentProblem;
      if (updates.mainSteps) dbUpdates.main_steps = updates.mainSteps;
      if (updates.alternativeFlows !== undefined) dbUpdates.alternative_flows = updates.alternativeFlows;
      if (updates.businessRules !== undefined) dbUpdates.business_rules = updates.businessRules;
      if (updates.validations !== undefined) dbUpdates.validations = updates.validations;
      if (updates.acceptanceCriteria) dbUpdates.acceptance_criteria = updates.acceptanceCriteria;
      if (updates.dependencies !== undefined) dbUpdates.dependencies = updates.dependencies;
      if (updates.technicalRisks !== undefined) dbUpdates.technical_risks = updates.technicalRisks;
      if (updates.requiresSpike !== undefined) dbUpdates.requires_spike = updates.requiresSpike;
      if (updates.additionalComments !== undefined) dbUpdates.additional_comments = updates.additionalComments;
      if (updates.status) dbUpdates.status = updates.status;

      const dbStory = await db.updateUserStory(id, dbUpdates);
      const updatedStory = convertDbUserStoryToApp(dbStory);
      setUserStories(prev => prev.map(story => story.id === id ? updatedStory : story));
      return updatedStory;
    } catch (error) {
      console.error('Error updating user story:', error);
      throw error;
    }
  };

  const deleteUserStory = async (id: string) => {
    try {
      await db.deleteUserStory(id);
      setUserStories(prev => prev.filter(story => story.id !== id));
    } catch (error) {
      console.error('Error deleting user story:', error);
      throw error;
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