export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'project_manager' | 'collaborator' | 'reader'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'project_manager' | 'collaborator' | 'reader'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'project_manager' | 'collaborator' | 'reader'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          members: string[]
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          members?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          members?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          company_name: string
          contact_person: string
          email: string
          phone: string
          address: string
          collaborators: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_person: string
          email: string
          phone: string
          address?: string
          collaborators?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_person?: string
          email?: string
          phone?: string
          address?: string
          collaborators?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string
          client_id: string | null
          team_id: string | null
          duration: string
          technologies: string[]
          status: 'planning' | 'active' | 'completed' | 'paused'
          start_date: string
          end_date: string | null
          internal_notes: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          client_id?: string | null
          team_id?: string | null
          duration: string
          technologies?: string[]
          status?: 'planning' | 'active' | 'completed' | 'paused'
          start_date: string
          end_date?: string | null
          internal_notes?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          client_id?: string | null
          team_id?: string | null
          duration?: string
          technologies?: string[]
          status?: 'planning' | 'active' | 'completed' | 'paused'
          start_date?: string
          end_date?: string | null
          internal_notes?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_stories: {
        Row: {
          id: string
          project_id: string | null
          date: string
          author: string
          user_persona: string
          user_role: string
          user_constraints: string
          user_desire: string
          user_importance: string
          current_problem: string
          main_steps: string
          alternative_flows: string
          business_rules: string
          validations: string
          acceptance_criteria: string
          dependencies: string
          technical_risks: string
          requires_spike: string
          additional_comments: string
          status: 'draft' | 'ready' | 'in-progress' | 'in-review' | 'done'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          project_id?: string | null
          date: string
          author: string
          user_persona: string
          user_role: string
          user_constraints?: string
          user_desire: string
          user_importance: string
          current_problem: string
          main_steps: string
          alternative_flows?: string
          business_rules?: string
          validations?: string
          acceptance_criteria: string
          dependencies?: string
          technical_risks?: string
          requires_spike?: string
          additional_comments?: string
          status?: 'draft' | 'ready' | 'in-progress' | 'in-review' | 'done'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          date?: string
          author?: string
          user_persona?: string
          user_role?: string
          user_constraints?: string
          user_desire?: string
          user_importance?: string
          current_problem?: string
          main_steps?: string
          alternative_flows?: string
          business_rules?: string
          validations?: string
          acceptance_criteria?: string
          dependencies?: string
          technical_risks?: string
          requires_spike?: string
          additional_comments?: string
          status?: 'draft' | 'ready' | 'in-progress' | 'in-review' | 'done'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'project_manager' | 'collaborator' | 'reader'
      project_status: 'planning' | 'active' | 'completed' | 'paused'
      story_status: 'draft' | 'ready' | 'in-progress' | 'in-review' | 'done'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}