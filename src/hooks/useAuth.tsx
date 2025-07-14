import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, auth, db } from '../lib/supabase';
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Load user profile from Supabase
  const loadUserProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('👤 Carregando perfil do usuário:', userId);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        
        // Se o perfil não existe, aguardar um pouco e tentar novamente
        if (error.code === 'PGRST116') {
          console.log('📝 Perfil não encontrado, aguardando criação automática...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: retryProfile, error: retryError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (retryError) {
            console.error('Perfil ainda não encontrado após retry:', retryError);
            
            // Try to create profile manually as last resort
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user && user.email) {
                console.log('🔧 Tentando criar perfil manualmente...');
                
                // Determine role based on email
                let role: Profile['role'] = 'reader';
                if (user.email === 'admin@demo.com') role = 'admin';
                else if (user.email === 'manager@demo.com') role = 'project_manager';
                else if (user.email === 'collab@demo.com') role = 'collaborator';
                else if (user.email === 'reader@demo.com') role = 'reader';
                
                const { data: createdProfile, error: createError } = await supabase
                  .from('profiles')
                  .insert({
                    id: userId,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || user.email.split('@')[0],
                    role: role
                  })
                  .select()
                  .single();
                
                if (createError) {
                  console.error('Erro ao criar perfil manualmente:', createError);
                  return null;
                }
                
                console.log('✅ Perfil criado manualmente:', createdProfile.email, 'Role:', createdProfile.role);
                return createdProfile;
              }
            } catch (createError) {
              console.error('Erro na criação manual do perfil:', createError);
            }
            
            return null;
          }
          
          if (retryProfile) {
            console.log('✅ Perfil encontrado após retry:', retryProfile.email, 'Role:', retryProfile.role);
            return retryProfile;
          }
        }
        return null;
      }

      if (profile) {
        console.log('✅ Perfil carregado:', profile.email, 'Role:', profile.role);
        return profile;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Inicializando autenticação...');
        
        // Set timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted && !initialized) {
            console.log('⏰ Timeout na inicialização - definindo loading como false');
            setLoading(false);
            setInitialized(true);
          }
        }, 10000); // 10 seconds timeout
        
        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao verificar sessão:', error);
          if (mounted) {
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        if (session?.user) {
          console.log('🔐 Sessão existente encontrada para:', session.user.email);
          setUser(session.user);
          
          const userProfile = await loadUserProfile(session.user.id);
          if (mounted) {
            setProfile(userProfile);
          }
        } else {
          console.log('🚪 Nenhuma sessão ativa encontrada');
        }
        
        if (mounted) {
          setLoading(false);
          setInitialized(true);
          clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('Erro na inicialização da autenticação:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
          clearTimeout(timeoutId);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Estado de autenticação mudou:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('🚪 Usuário deslogado');
          setUser(null);
          setProfile(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 Usuário logado:', session.user.email);
          setUser(session.user);
          
          const userProfile = await loadUserProfile(session.user.id);
          if (mounted) {
            setProfile(userProfile);
          }
        }
        
        if (mounted && initialized) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Tentando fazer login para:', email);
      setLoading(true);
      
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
        
        const userProfile = await loadUserProfile(data.user.id);
        
        if (!userProfile) {
          console.error('❌ Perfil não encontrado após todas as tentativas');
          setUser(null);
          throw new Error('Perfil de usuário não encontrado. Verifique se sua conta foi configurada corretamente ou contate o administrador.');
        }
        
        setProfile(userProfile);
        console.log('✅ Login completo - Usuário e perfil carregados');
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      setUser(null);
      setProfile(null);
      throw error;
    } finally {
      setLoading(false);
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
    
    try {
      await auth.signOut();
      setUser(null);
      setProfile(null);
      console.log('✅ Logout concluído - estado limpo');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
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