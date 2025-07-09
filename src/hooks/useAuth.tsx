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

// Session management constants
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const SESSION_KEY = 'demo_session';
const LAST_ACTIVITY_KEY = 'demo_last_activity';

interface SessionData {
  user: User;
  profile: Profile;
  mfaEnabled: boolean;
  lastActivity: number;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  // Update last activity timestamp
  const updateLastActivity = () => {
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    return now;
  };

  // Check if session is still valid (not expired due to inactivity)
  const isSessionValid = (): boolean => {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return false;
    
    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
    return timeSinceLastActivity < IDLE_TIMEOUT;
  };

  // Save session with current timestamp
  const saveSession = (userData: User, profileData: Profile, mfaEnabledData: boolean) => {
    const now = updateLastActivity();
    const sessionData: SessionData = {
      user: userData,
      profile: profileData,
      mfaEnabled: mfaEnabledData,
      lastActivity: now
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  };

  // Load session if valid
  const loadSession = (): boolean => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      
      if (!sessionData) {
        return false;
      }

      // Check if session is still valid (not expired due to inactivity)
      if (!isSessionValid()) {
        clearSession();
        return false;
      }

      const session: SessionData = JSON.parse(sessionData);
      
      // Session is valid, restore state and update activity
      setUser(session.user);
      setProfile(session.profile);
      setMfaEnabled(session.mfaEnabled);
      updateLastActivity();
      
      return true;
    } catch (error) {
      console.error('Error loading session:', error);
      clearSession();
      return false;
    }
  };

  // Clear session data
  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    // Keep old keys for backward compatibility cleanup
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_profile');
    localStorage.removeItem('demo_mfa_enabled');
  };

  // Auto logout when session expires due to inactivity
  useEffect(() => {
    if (!user) return;

    const checkSessionExpiry = () => {
      if (!isSessionValid()) {
        // Session expired due to inactivity, logout user
        setUser(null);
        setProfile(null);
        setMfaEnabled(false);
        clearSession();
        alert('Sua sessão expirou por inatividade. Faça login novamente.');
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkSessionExpiry, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Track user activity to extend session
  useEffect(() => {
    if (!user) return;

    const handleUserActivity = () => {
      if (user && profile && isSessionValid()) {
        // Update last activity and save session
        saveSession(user, profile, mfaEnabled);
      }
    };

    // Events that indicate user activity
    const events = [
      'mousedown', 
      'mousemove', 
      'keypress', 
      'scroll', 
      'touchstart', 
      'click',
      'focus',
      'blur'
    ];
    
    // Add throttling to avoid too frequent updates
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledHandler = () => {
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        handleUserActivity();
        throttleTimeout = null;
      }, 1000); // Update at most once per second
    };

    events.forEach(event => {
      document.addEventListener(event, throttledHandler, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledHandler, true);
      });
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [user, profile, mfaEnabled]);

  useEffect(() => {
    // Check for existing valid session on app start
    const checkExistingSession = () => {
      const hasValidSession = loadSession();
      
      if (!hasValidSession) {
        // No valid session, start fresh
        setUser(null);
        setProfile(null);
        setMfaEnabled(false);
      }
      
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
    
    // Save session with current timestamp
    saveSession(mockUser, demoUser.profile, userMfaEnabled);
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
    
    // Save session with current timestamp
    saveSession(mockUser, newProfile, false);
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    setMfaEnabled(false);
    clearSession();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) throw new Error('No user logged in');
    
    const updatedProfile = { ...profile, ...updates };
    setProfile(updatedProfile);
    
    // Update session with new profile data
    if (user) {
      saveSession(user, updatedProfile, mfaEnabled);
    }
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
      
      // Update session with MFA enabled
      if (profile) {
        saveSession(user, profile, true);
      }
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
    
    // Update session with MFA disabled
    if (profile) {
      saveSession(user, profile, false);
    }
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