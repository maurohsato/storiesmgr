import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, auth } from '../lib/supabase';
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
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
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
  lastActivity: number;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Force clear any invalid sessions on app start
  useEffect(() => {
    const clearInvalidSessions = async () => {
      console.log('🧹 Limpando sessões inválidas...');
      
      // Clear all local storage related to auth
      clearSession();
      
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
        
        // Save session data
        saveSession({
          id: userId,
          email: profile.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User, profile);
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
  const saveSession = (userData: User, profileData: Profile) => {
    const now = updateLastActivity();
    const sessionData: SessionData = {
      user: userData,
      profile: profileData,
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
        saveSession(user, profile);
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
  }, [user, profile]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Tentando fazer login para:', email);
      
      // Fazer login no Supabase diretamente
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
        console.log('✅ Login bem-sucedido para:', email);
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
    saveSession(user, updatedProfile);
    
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
    changePassword,
    hasRole,
    canManageUsers,
    canManageContent,
    canCreateContent,
    isReadOnly,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};