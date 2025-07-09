import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  hasRole: (roles: Profile['role'] | Profile['role'][]) => boolean;
  canManageUsers: () => boolean;
  canManageContent: () => boolean;
  canCreateContent: () => boolean;
  isReadOnly: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Demo users for local development
const DEMO_USERS = [
  {
    id: '1',
    email: 'admin@demo.com',
    password: 'demo123',
    profile: {
      id: '1',
      email: 'admin@demo.com',
      full_name: 'Administrador Demo',
      role: 'admin' as const,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  },
  {
    id: '2',
    email: 'manager@demo.com',
    password: 'demo123',
    profile: {
      id: '2',
      email: 'manager@demo.com',
      full_name: 'Gerente Demo',
      role: 'project_manager' as const,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  },
  {
    id: '3',
    email: 'collab@demo.com',
    password: 'demo123',
    profile: {
      id: '3',
      email: 'collab@demo.com',
      full_name: 'Colaborador Demo',
      role: 'collaborator' as const,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  },
  {
    id: '4',
    email: 'reader@demo.com',
    password: 'demo123',
    profile: {
      id: '4',
      email: 'reader@demo.com',
      full_name: 'Leitor Demo',
      role: 'reader' as const,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const checkExistingSession = () => {
      const savedUser = localStorage.getItem('demo_user');
      const savedProfile = localStorage.getItem('demo_profile');
      
      if (savedUser && savedProfile) {
        setUser(JSON.parse(savedUser));
        setProfile(JSON.parse(savedProfile));
      }
      
      setLoading(false);
    };

    checkExistingSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    const demoUser = DEMO_USERS.find(u => u.email === email && u.password === password);
    
    if (!demoUser) {
      throw new Error('Credenciais inválidas. Use uma das contas de demonstração.');
    }

    const mockUser = {
      id: demoUser.id,
      email: demoUser.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as User;

    setUser(mockUser);
    setProfile(demoUser.profile);
    
    // Save to localStorage
    localStorage.setItem('demo_user', JSON.stringify(mockUser));
    localStorage.setItem('demo_profile', JSON.stringify(demoUser.profile));
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    // For demo purposes, just create a new reader user
    const newId = Date.now().toString();
    const mockUser = {
      id: newId,
      email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as User;

    const newProfile: Profile = {
      id: newId,
      email,
      full_name: fullName,
      role: 'reader',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUser(mockUser);
    setProfile(newProfile);
    
    // Save to localStorage
    localStorage.setItem('demo_user', JSON.stringify(mockUser));
    localStorage.setItem('demo_profile', JSON.stringify(newProfile));
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_profile');
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) throw new Error('No user logged in');
    
    const updatedProfile = { ...profile, ...updates };
    setProfile(updatedProfile);
    localStorage.setItem('demo_profile', JSON.stringify(updatedProfile));
  };

  // Permission helpers
  const hasRole = (roles: Profile['role'] | Profile['role'][]) => {
    if (!profile) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(profile.role);
  };

  const canManageUsers = () => hasRole('admin');
  
  const canManageContent = () => hasRole(['admin', 'project_manager']);
  
  const canCreateContent = () => hasRole(['admin', 'project_manager', 'collaborator']);
  
  const isReadOnly = () => hasRole('reader');

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    hasRole,
    canManageUsers,
    canManageContent,
    canCreateContent,
    isReadOnly,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};