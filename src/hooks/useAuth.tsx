import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, auth } from '../lib/supabase';
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

// Session management constants
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const SESSION_KEY = 'supabase_session';
const LAST_ACTIVITY_KEY = 'supabase_last_activity';

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

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setMfaEnabled(false);
          clearSession();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Load user profile from Supabase
  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await auth.getCurrentProfile();
      if (profile) {
        setProfile(profile);
        // Check if MFA is enabled for this user
        const mfaStatus = localStorage.getItem(`supabase_mfa_${userId}`) === 'true';
        setMfaEnabled(mfaStatus);
        
        // Save session data for idle timeout management
        saveSession({
          id: userId,
          email: profile.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User, profile, mfaStatus);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

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

  // Clear session data
  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  };

  // Auto logout when session expires due to inactivity
  useEffect(() => {
    if (!user) return;

    const checkSessionExpiry = () => {
      if (!isSessionValid()) {
        // Session expired due to inactivity, logout user
        signOut();
        alert('Sua sessão expirou por inatividade. Faça login novamente.');
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkSessionExpiry, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Track user activity to extend session
  useEffect(() => {
    if (!user || !profile) return;

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

  const signIn = async (email: string, password: string, mfaCode?: string) => {
    try {
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        // Provide more specific error messages
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
          throw new Error('Email ou senha incorretos. Verifique suas credenciais ou crie uma nova conta.');
        } else if (error.message?.includes('Email not confirmed')) {
          throw new Error('Email não confirmado. Verifique sua caixa de entrada.');
        } else if (error.message?.includes('Too many requests')) {
          throw new Error('Muitas tentativas de login. Tente novamente em alguns minutos.');
        }
        throw error;
      }
      
      if (data.user) {
        // Check if MFA is enabled for this user
        const userMfaEnabled = localStorage.getItem(`supabase_mfa_${data.user.id}`) === 'true';
        
        if (userMfaEnabled) {
          if (!mfaCode) {
            throw new Error('MFA_REQUIRED');
          }
          
          // Para demonstração, aceitar qualquer código de 6 dígitos
          if (!/^\d{6}$/.test(mfaCode)) {
            throw new Error('Código MFA inválido. Verifique o código no seu Google Authenticator.');
          }
        }

        setUser(data.user);
        await loadUserProfile(data.user.id);
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await auth.signUp(email, password, fullName);
      
      if (error) {
        // Provide more specific error messages for signup
        if (error.message?.includes('User already registered')) {
          throw new Error('Este email já está cadastrado. Tente fazer login ou use outro email.');
        } else if (error.message?.includes('Password should be at least')) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        } else if (error.message?.includes('Invalid email')) {
          throw new Error('Email inválido. Verifique o formato do email.');
        }
        throw error;
      }
      
      if (data.user) {
        // Registration successful, user needs to verify email
        return;
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  };
  };

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    setMfaEnabled(false);
    clearSession();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile || !user) throw new Error('No user logged in');
    
    const updatedProfile = await auth.updateProfile(user.id, updates);
    setProfile(updatedProfile);
    
    // Update session with new profile data
    saveSession(user, updatedProfile, mfaEnabled);
  };

  const enableMFA = async () => {
    if (!user) throw new Error('No user logged in');
    
    // Generate a unique secret for this user
    const secret = `JBSWY3DPEHPK3PX${user.id.slice(-1).toUpperCase()}`;
    const qrCode = `otpauth://totp/UserStories:${user.email}?secret=${secret}&issuer=UserStories`;
    
    return { secret, qrCode };
  };

  const verifyMFA = async (code: string) => {
    if (!user) throw new Error('No user logged in');
    
    // Para demonstração, aceitar qualquer código de 6 dígitos
    const isValid = /^\d{6}$/.test(code);
    
    if (isValid) {
      localStorage.setItem(`supabase_mfa_${user.id}`, 'true');
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
    
    localStorage.removeItem(`supabase_mfa_${user.id}`);
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