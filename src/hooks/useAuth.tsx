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
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  enableMFA: () => Promise<{ secret: string; qrCode: string; manualEntryKey: string }>;
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

// Session management constants - 30 minutos
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
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

  // Force clear any invalid sessions on app start
  useEffect(() => {
    const clearInvalidSessions = async () => {
      console.log('🧹 Limpando sessões inválidas...');
      
      // Check if a session exists before attempting to sign out
      const { data: { session } } = await supabase.auth.getSession();
      
      // Only sign out if a session actually exists
      if (session) {
        await supabase.auth.signOut();
      }
      
      // Clear all local storage related to auth
      clearSession();
      
      // Clear any MFA data that might be orphaned
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase_mfa') || key.includes('temp_mfa')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ Sessões limpas - usuário deve fazer login');
    };
    
    clearInvalidSessions();
  }, []); // Run only once on mount

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let initializationTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Inicializando autenticação...');
        
        // Set a timeout to prevent infinite loading
        initializationTimeout = setTimeout(() => {
          if (mounted) {
            console.log('⏰ Timeout na inicialização - definindo loading como false');
            setLoading(false);
          }
        }, 5000); // 5 seconds timeout

        // For security, we always require fresh login
        // No automatic session restoration
        console.log('🔒 Política de segurança: Login obrigatório a cada sessão');
        clearSession();
      } catch (error) {
        console.error('Erro na inicialização da autenticação:', error);
        clearSession();
      } finally {
        if (mounted) {
          clearTimeout(initializationTimeout);
          setLoading(false);
        }
      }
    };

    // Delay initialization to ensure cleanup is complete
    setTimeout(initializeAuth, 100);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Estado de autenticação mudou:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('🚪 Usuário deslogado');
          setUser(null);
          setProfile(null);
          setMfaEnabled(false);
          clearSession();
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 Usuário logado via evento:', session.user.email);
          // O login será tratado pela função signIn, não aqui
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(initializationTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Load user profile from Supabase
  const loadUserProfile = async (userId: string) => {
    try {
      console.log('👤 Carregando perfil do usuário:', userId);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return;
      }

      if (profile) {
        console.log('✅ Perfil carregado:', profile.email, 'Role:', profile.role);
        setProfile(profile);
        
        // Check if MFA is enabled for this user
        const mfaStatus = localStorage.getItem(`supabase_mfa_${userId}`) === 'true';
        setMfaEnabled(mfaStatus);
        
        // Save session data
        saveSession({
          id: userId,
          email: profile.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User, profile, mfaStatus);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  // Update last activity timestamp
  const updateLastActivity = () => {
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    return now;
  };

  // Check if session is still valid
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

  // Auto logout when session expires
  useEffect(() => {
    if (!user || !profile) return;

    const checkSessionExpiry = () => {
      if (!isSessionValid()) {
        console.log('⏰ Sessão expirou por inatividade');
        signOut();
        alert('Sua sessão expirou por inatividade. Faça login novamente.');
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkSessionExpiry, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, profile]);

  // Track user activity
  useEffect(() => {
    if (!user || !profile) return;

    const handleUserActivity = () => {
      if (user && profile && isSessionValid()) {
        saveSession(user, profile, mfaEnabled);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
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
      console.log('🔐 Tentando fazer login para:', email);
      
      // Verificar se MFA está configurado para este usuário
      const userMfaEnabled = localStorage.getItem(`supabase_mfa_${email}`) === 'true';
      
      if (!userMfaEnabled) {
        // MFA não configurado - usuário precisa configurar primeiro
        throw new Error('MFA_SETUP_REQUIRED');
      }
      
      if (!mfaCode) {
        // MFA configurado mas código não fornecido
        throw new Error('MFA_REQUIRED');
      }
      
      // Verificar código MFA primeiro
      const savedSecret = localStorage.getItem(`supabase_mfa_secret_${email}`);
      
      if (!savedSecret) {
        throw new Error('MFA não configurado corretamente. Configure novamente.');
      }
      
      // Verificação real do código MFA usando otplib
      const isValidMFA = authenticator.verify({
        token: mfaCode,
        secret: savedSecret
      });
      
      if (!isValidMFA) {
        throw new Error('Código MFA inválido. Verifique o código no Google Authenticator.');
      }
      
      console.log('✅ MFA verificado com sucesso');
      
      // Agora fazer login no Supabase
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('Email ou senha incorretos.');
        } else if (error.message?.includes('Email not confirmed')) {
          throw new Error('Email não confirmado. Verifique sua caixa de entrada.');
        } else if (error.message?.includes('Too many requests')) {
          throw new Error('Muitas tentativas. Tente novamente em alguns minutos.');
        }
        throw error;
      }
      
      if (data.user) {
        console.log('✅ Login completo bem-sucedido para:', email);
        
        // Set MFA as enabled
        localStorage.setItem(`supabase_mfa_${data.user.id}`, 'true');
        setMfaEnabled(true);

        setUser(data.user);
        await loadUserProfile(data.user.id);
        
        console.log('✅ Usuário e perfil carregados com sucesso');
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('📝 Criando nova conta para:', email);
      
      const { data, error } = await auth.signUp(email, password, fullName);
      
      if (error) {
        if (error.message?.includes('User already registered')) {
          throw new Error('Este email já está cadastrado. Tente fazer login.');
        } else if (error.message?.includes('Password should be at least')) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        } else if (error.message?.includes('Invalid email')) {
          throw new Error('Email inválido.');
        }
        throw error;
      }
      
      if (data.user) {
        console.log('✅ Conta criada com sucesso para:', email);
        return;
      }
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('🚪 Fazendo logout...');
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
    saveSession(user, updatedProfile, mfaEnabled);
    
    return updatedProfile;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('No user logged in');
    
    // First verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });
    
    if (verifyError) {
      throw new Error('Senha atual incorreta');
    }
    
    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      throw new Error('Erro ao alterar senha: ' + error.message);
    }
  };

  const enableMFA = async () => {
    if (!user) throw new Error('No user logged in');
    
    const secret = authenticator.generateSecret();
    
    const otpAuthUrl = authenticator.keyuri(
      user.email!,
      'User Stories Manager',
      secret
    );
    
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    
    localStorage.setItem(`temp_mfa_secret_${user.id}`, secret);
    
    return { 
      secret, 
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret.match(/.{1,4}/g)?.join(' ') || secret
    };
  };

  const verifyMFA = async (code: string) => {
    if (!user) throw new Error('No user logged in');
    
    const tempSecret = localStorage.getItem(`temp_mfa_secret_${user.id}`);
    if (!tempSecret) {
      throw new Error('Secret MFA não encontrado. Inicie o processo novamente.');
    }
    
    const isValid = authenticator.verify({
      token: code,
      secret: tempSecret
    });
    
    if (isValid) {
      localStorage.setItem(`supabase_mfa_${user.id}`, 'true');
      localStorage.setItem(`supabase_mfa_secret_${user.id}`, tempSecret);
      localStorage.setItem(`supabase_mfa_secret_${user.email}`, tempSecret);
      localStorage.removeItem(`temp_mfa_secret_${user.id}`);
      setMfaEnabled(true);
      
      if (profile) {
        saveSession(user, profile, true);
      }
    }
    
    return isValid;
  };

  const disableMFA = async (code: string) => {
    if (!user) throw new Error('No user logged in');
    
    const savedSecret = localStorage.getItem(`supabase_mfa_secret_${user.id}`);
    if (!savedSecret) {
      throw new Error('MFA não está configurado');
    }
    
    const isValid = authenticator.verify({
      token: code,
      secret: savedSecret
    });
    
    if (!isValid) {
      throw new Error('Código MFA inválido');
    }
    
    localStorage.removeItem(`supabase_mfa_${user.id}`);
    localStorage.removeItem(`supabase_mfa_secret_${user.id}`);
    localStorage.removeItem(`supabase_mfa_secret_${user.email}`);
    setMfaEnabled(false);
    
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
    changePassword,
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