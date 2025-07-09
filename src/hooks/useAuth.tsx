import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  mfaEnabled: boolean;
  signIn: (email: string, password: string, mfaCode?: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  enableMFA: () => Promise<{ secret: string; qrCode: string }>;
  verifyMFA: (code: string) => Promise<boolean>;
  disableMFA: (code: string) => Promise<void>;
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
    },
    mfaSecret: 'JBSWY3DPEHPK3PXP'
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
    },
    mfaSecret: 'JBSWY3DPEHPK3PXQ'
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
    },
    mfaSecret: 'JBSWY3DPEHPK3PXR'
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
    },
    mfaSecret: 'JBSWY3DPEHPK3PXS'
  }
];

// Simple TOTP implementation for demo
const generateTOTP = (secret: string, timeWindow?: number): string => {
  const time = timeWindow || Math.floor(Date.now() / 30000);
  // Simpler demo implementation that generates consistent codes
  const combined = secret + time.toString();
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString().padStart(6, '0').slice(0, 6);
};

const verifyTOTP = (secret: string, token: string): boolean => {
  const currentTime = Math.floor(Date.now() / 30000);
  
  // Check current time window and previous/next windows for clock drift
  for (let i = -1; i <= 1; i++) {
    const timeWindow = currentTime + i;
    const expectedToken = generateTOTP(secret, timeWindow);
    if (expectedToken === token) {
      return true;
    }
  }
  
  return false;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  useEffect(() => {
    // Check for existing session in localStorage
    const checkExistingSession = () => {
      // Não carregar sessão automaticamente - sempre começar na tela de login
      // try {
      //   const savedUser = localStorage.getItem('demo_user');
      //   const savedProfile = localStorage.getItem('demo_profile');
      //   const savedMfaEnabled = localStorage.getItem('demo_mfa_enabled');
      //   
      //   if (savedUser && savedProfile) {
      //     setUser(JSON.parse(savedUser));
      //     setProfile(JSON.parse(savedProfile));
      //     setMfaEnabled(savedMfaEnabled === 'true');
      //   }
      // } catch (error) {
      //   console.error('Error loading session:', error);
      //   // Clear corrupted data
      //   localStorage.removeItem('demo_user');
      //   localStorage.removeItem('demo_profile');
      //   localStorage.removeItem('demo_mfa_enabled');
      // }
      
      setLoading(false);
    };

    checkExistingSession();
  }, []);

  const signIn = async (email: string, password: string, mfaCode?: string) => {
    const demoUser = DEMO_USERS.find(u => u.email === email && u.password === password);
    
    if (!demoUser) {
      throw new Error('Credenciais inválidas. Use uma das contas de demonstração.');
    }

    // Check if MFA is enabled for this user
    const userMfaEnabled = localStorage.getItem(`demo_mfa_${demoUser.id}`) === 'true';
    
    if (userMfaEnabled) {
      if (!mfaCode) {
        throw new Error('MFA_REQUIRED');
      }
      
      // Para demonstração, aceitar qualquer código de 6 dígitos
      if (!/^\d{6}$/.test(mfaCode)) {
        throw new Error('Código MFA inválido. Verifique o código no seu Google Authenticator.');
      }
    }

    const mockUser = {
      id: demoUser.id,
      email: demoUser.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as User;

    setUser(mockUser);
    setProfile(demoUser.profile);
    setMfaEnabled(userMfaEnabled);
    
    // Save to localStorage
    localStorage.setItem('demo_user', JSON.stringify(mockUser));
    localStorage.setItem('demo_profile', JSON.stringify(demoUser.profile));
    localStorage.setItem('demo_mfa_enabled', userMfaEnabled.toString());
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
    setMfaEnabled(false);
    
    // Save to localStorage
    localStorage.setItem('demo_user', JSON.stringify(mockUser));
    localStorage.setItem('demo_profile', JSON.stringify(newProfile));
    localStorage.setItem('demo_mfa_enabled', 'false');
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    setMfaEnabled(false);
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_profile');
    localStorage.removeItem('demo_mfa_enabled');
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) throw new Error('No user logged in');
    
    const updatedProfile = { ...profile, ...updates };
    setProfile(updatedProfile);
    localStorage.setItem('demo_profile', JSON.stringify(updatedProfile));
  };

  const enableMFA = async () => {
    if (!user) throw new Error('No user logged in');
    
    const demoUser = DEMO_USERS.find(u => u.id === user.id);
    if (!demoUser) throw new Error('User not found');
    
    const secret = demoUser.mfaSecret;
    const qrCode = `otpauth://totp/UserStories:${user.email}?secret=${secret}&issuer=UserStories`;
    
    return { secret, qrCode };
  };

  const verifyMFA = async (code: string) => {
    if (!user) throw new Error('No user logged in');
    
    // Para demonstração, aceitar qualquer código de 6 dígitos
    const isValid = /^\d{6}$/.test(code);
    
    if (isValid) {
      localStorage.setItem(`demo_mfa_${user.id}`, 'true');
      setMfaEnabled(true);
      localStorage.setItem('demo_mfa_enabled', 'true');
    }
    
    return isValid;
  };

  const disableMFA = async (code: string) => {
    if (!user) throw new Error('No user logged in');
    
    // Para demonstração, aceitar qualquer código de 6 dígitos
    if (!/^\d{6}$/.test(code)) {
      throw new Error('Código MFA inválido');
    }
    
    localStorage.removeItem(`demo_mfa_${user.id}`);
    setMfaEnabled(false);
    localStorage.setItem('demo_mfa_enabled', 'false');
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
    mfaEnabled,
    signIn,
    signUp,
    signOut,
    updateProfile,
    enableMFA,
    verifyMFA,
    disableMFA,
    hasRole,
    canManageUsers,
    canManageContent,
    canCreateContent,
    isReadOnly,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};