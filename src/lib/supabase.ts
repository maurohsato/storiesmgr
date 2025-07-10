import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
});

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, fullName: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  },

  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  signOut: async () => {
    return await supabase.auth.signOut();
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  getCurrentProfile: async () => {
    const user = await auth.getCurrentUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return profile;
  },

  updateProfile: async (userId: string, updates: Partial<Database['public']['Tables']['profiles']['Update']>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  createProfile: async (profile: Database['public']['Tables']['profiles']['Insert']) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// Database helpers
export const db = {
  // Profiles
  getProfiles: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  updateProfile: async (id: string, updates: Partial<Database['public']['Tables']['profiles']['Update']>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  createProfile: async (profile: Database['public']['Tables']['profiles']['Insert']) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Teams
  getTeams: async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  createTeam: async (team: Database['public']['Tables']['teams']['Insert']) => {
    const user = await auth.getCurrentUser();
    const { data, error } = await supabase
      .from('teams')
      .insert({ ...team, created_by: user?.id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateTeam: async (id: string, updates: Database['public']['Tables']['teams']['Update']) => {
    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteTeam: async (id: string) => {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Clients
  getClients: async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  createClient: async (client: Database['public']['Tables']['clients']['Insert']) => {
    const user = await auth.getCurrentUser();
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...client, created_by: user?.id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateClient: async (id: string, updates: Database['public']['Tables']['clients']['Update']) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteClient: async (id: string) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Projects
  getProjects: async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(*),
        team:teams(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  createProject: async (project: Database['public']['Tables']['projects']['Insert']) => {
    const user = await auth.getCurrentUser();
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...project, created_by: user?.id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateProject: async (id: string, updates: Database['public']['Tables']['projects']['Update']) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteProject: async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // User Stories
  getUserStories: async () => {
    const { data, error } = await supabase
      .from('user_stories')
      .select(`
        *,
        project:projects(name),
        creator:profiles(full_name, email)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  createUserStory: async (story: Database['public']['Tables']['user_stories']['Insert']) => {
    const user = await auth.getCurrentUser();
    const { data, error } = await supabase
      .from('user_stories')
      .insert({ ...story, created_by: user?.id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateUserStory: async (id: string, updates: Database['public']['Tables']['user_stories']['Update']) => {
    const { data, error } = await supabase
      .from('user_stories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteUserStory: async (id: string) => {
    const { error } = await supabase
      .from('user_stories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};