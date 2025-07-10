import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, auth } from '../lib/supabase';
import { Database } from '../types/database';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

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

// Session management constants - aumentar timeout para 30 minutos
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
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
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check for existing session first
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
          try {
            const sessionData: SessionData = JSON.parse(savedSession);
            
            // Check if session is still valid
            if (isSessionValid()) {
              setUser(sessionData.user);
              setProfile(sessionData.profile);
              setMfaEnabled(sessionData.mfaEnabled);
              updateLastActivity();
              
              if (mounted) {
                setLoading(false);
              }
              return;
            } else {
              // Session expired, clear it
              clearSession();
            }
          } catch (error) {
            console.error('Error parsing saved session:', error);
            clearSession();
          }
        }

        // Get session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (session?.user && mounted) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.email);
        
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

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load user profile from Supabase
  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

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
    if (!user || !profile) return;

    const checkSessionExpiry = () => {
      if (!isSessionValid()) {
        // Session expired due to inactivity, logout user
        signOut();
        alert('Sua sessão expirou por inatividade. Faça login novamente.');
      }
    };

    // Check every 5 minutes instead of 30 seconds
    const interval = setInterval(checkSessionExpiry, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, profile]);

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
      'focus'
    ];
    
    // Add throttling to avoid too frequent updates
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledHandler = () => {
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        handleUserActivity();
        throttleTimeout = null;
      }, 30000); // Update at most once per 30 seconds
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
      // Check if MFA is required for this user BEFORE attempting login
      // Para verificar MFA, precisamos do user ID, então vamos fazer login primeiro
      
      // For admin@demo.com, MFA is MANDATORY
      const isMfaMandatory = email === 'admin@demo.com';
      
      // Primeiro, tentar fazer login
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        // Provide more specific error messages
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
          throw new Error('Email ou senha incorretos. Verifique suas credenciais.');
        } else if (error.message?.includes('Email not confirmed')) {
          throw new Error('Email não confirmado. Verifique sua caixa de entrada.');
        } else if (error.message?.includes('Too many requests')) {
          throw new Error('Muitas tentativas de login. Tente novamente em alguns minutos.');
        }
        throw error;
      }
      
      if (data.user) {
        // Verificar se MFA está habilitado para este usuário
        const userMfaEnabled = localStorage.getItem(`supabase_mfa_${data.user.id}`) === 'true';
        
        if ((userMfaEnabled || isMfaMandatory) && !mfaCode) {
          // Fazer logout e solicitar MFA
          await auth.signOut();
          throw new Error('MFA_REQUIRED');
        }
        
        if ((userMfaEnabled || isMfaMandatory) && mfaCode) {
          // Verificar código MFA
          const savedSecret = localStorage.getItem(`supabase_mfa_secret_${data.user.id}`);
          
          if (!savedSecret && isMfaMandatory) {
            // Para admin@demo.com, se não tem MFA configurado, forçar configuração
            await auth.signOut();
            throw new Error('MFA não configurado. Configure o MFA antes de fazer login.');
          }
          
          if (savedSecret) {
            const isValidMFA = authenticator.verify({
              token: mfaCode,
              secret: savedSecret
            });
            
            if (!isValidMFA) {
              await auth.signOut();
              throw new Error('Código MFA inválido. Verifique o código no Google Authenticator.');
            }
          }
        }
        
        // For admin@demo.com, automatically enable MFA
        if (email === 'admin@demo.com') {
          const mfaKey = `supabase_mfa_${data.user.id}`;
          localStorage.setItem(mfaKey, 'true');
          setMfaEnabled(true);
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

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    setMfaEnabled(false);
    clearSession();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile || !user) throw new Error('No user logged in');
    
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    setProfile(updatedProfile);
    
    // Update session with new profile data
    saveSession(user, updatedProfile, mfaEnabled);
    
    return updatedProfile;
  };

  const enableMFA = async () => {
    if (!user) throw new Error('No user logged in');
    
    // Gerar um secret único para este usuário usando otplib
    const secret = authenticator.generateSecret();
    
    // Criar URL para o Google Authenticator
    const otpAuthUrl = authenticator.keyuri(
      user.email,
      'User Stories Manager',
      secret
    );
    
    // Gerar QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    
    // Salvar o secret temporariamente (será confirmado quando o usuário verificar)
    localStorage.setItem(`temp_mfa_secret_${user.id}`, secret);
    
    return { 
      secret, 
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret.match(/.{1,4}/g)?.join(' ') || secret
    };
  };

  const verifyMFA = async (code: string) => {
    if (!user) throw new Error('No user logged in');
    
    // Obter o secret temporário
    const tempSecret = localStorage.getItem(`temp_mfa_secret_${user.id}`);
    if (!tempSecret) {
      throw new Error('Secret MFA não encontrado. Inicie o processo novamente.');
    }
    
    // Verificar o código usando otplib
    const isValid = authenticator.verify({
      token: code,
      secret: tempSecret
    });
    
    if (isValid) {
      // Salvar o secret permanentemente
      localStorage.setItem(`supabase_mfa_${user.id}`, 'true');
      localStorage.setItem(`supabase_mfa_secret_${user.id}`, tempSecret);
      localStorage.removeItem(`temp_mfa_secret_${user.id}`);
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
    
    // Obter o secret salvo
    const savedSecret = localStorage.getItem(`supabase_mfa_secret_${user.id}`);
    if (!savedSecret) {
      throw new Error('MFA não está configurado para este usuário');
    }
    
    // Verificar o código atual
    const isValid = authenticator.verify({
      token: code,
      secret: savedSecret
    });
    
    if (!isValid) {
      throw new Error('Código MFA inválido');
    }
    
    // Remover MFA
    localStorage.removeItem(`supabase_mfa_${user.id}`);
    localStorage.removeItem(`supabase_mfa_secret_${user.id}`);
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