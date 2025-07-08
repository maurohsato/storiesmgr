import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Team, Client, Project, UserStoryData } from '../types';

interface AppContextType {
  teams: Team[];
  setTeams: (teams: Team[] | ((prev: Team[]) => Team[])) => void;
  clients: Client[];
  setClients: (clients: Client[] | ((prev: Client[]) => Client[])) => void;
  projects: Project[];
  setProjects: (projects: Project[] | ((prev: Project[]) => Project[])) => void;
  userStories: UserStoryData[];
  setUserStories: (stories: UserStoryData[] | ((prev: UserStoryData[]) => UserStoryData[])) => void;
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
  const [teams, setTeams] = useLocalStorage<Team[]>('teams', []);
  const [clients, setClients] = useLocalStorage<Client[]>('clients', []);
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const [userStories, setUserStories] = useLocalStorage<UserStoryData[]>('userStories', []);

  return (
    <AppContext.Provider
      value={{
        teams,
        setTeams,
        clients,
        setClients,
        projects,
        setProjects,
        userStories,
        setUserStories,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};