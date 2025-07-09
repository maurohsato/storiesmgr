import React, { createContext, useContext, ReactNode } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Team, Client, Project, UserStoryData } from '../types';

interface AppContextType {
  teams: Team[];
  clients: Client[];
  projects: Project[];
  userStories: UserStoryData[];
  loading: boolean;
  
  // Team operations
  createTeam: (team: Omit<Team, 'id' | 'createdAt'>) => Promise<Team>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<Team>;
  deleteTeam: (id: string) => Promise<void>;
  
  // Client operations
  createClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;
  
  // Project operations
  createProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  
  // User Story operations
  createUserStory: (story: Omit<UserStoryData, 'createdAt'>) => Promise<UserStoryData>;
  updateUserStory: (id: string, updates: Partial<UserStoryData>) => Promise<UserStoryData>;
  deleteUserStory: (id: string) => Promise<void>;
  
  // Refresh data
  loadAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const supabaseData = useSupabaseData();

  return (
    <AppContext.Provider
      value={supabaseData}
    >
      {children}
    </AppContext.Provider>
  );
};