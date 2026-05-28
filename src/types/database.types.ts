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
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      user_preferences: {
        Row: {
          user_id: string
          language: 'en' | 'ar'
          theme: 'light' | 'dark' | 'system'
          editor_layout: Json
          collapsed_panels: string[]
        }
        Insert: {
          user_id: string
          language?: 'en' | 'ar'
          theme?: 'light' | 'dark' | 'system'
          editor_layout?: Json
          collapsed_panels?: string[]
        }
        Update: {
          user_id?: string
          language?: 'en' | 'ar'
          theme?: 'light' | 'dark' | 'system'
          editor_layout?: Json
          collapsed_panels?: string[]
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          owner_id: string
          plan: 'free' | 'warrior' | 'elite' | 'champion' | 'legend'
          trial_ends_at: string | null
          stripe_customer_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          plan?: 'free' | 'warrior' | 'elite' | 'champion' | 'legend'
          trial_ends_at?: string | null
          stripe_customer_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          plan?: 'free' | 'warrior' | 'elite' | 'champion' | 'legend'
          trial_ends_at?: string | null
          stripe_customer_id?: string | null
          created_at?: string
        }
      }
      workspace_members: {
        Row: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer'
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer'
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer'
          invited_by?: string | null
          joined_at?: string
        }
      }
      dashboards: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workflows: {
        Row: {
          id: string
          dashboard_id: string | null
          workspace_id: string
          name: string
          description: string | null
          status: 'draft' | 'active' | 'archived' | 'published'
          thumbnail_url: string | null
          node_count: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dashboard_id?: string | null
          workspace_id: string
          name: string
          description?: string | null
          status?: 'draft' | 'active' | 'archived' | 'published'
          thumbnail_url?: string | null
          node_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dashboard_id?: string | null
          workspace_id?: string
          name?: string
          description?: string | null
          status?: 'draft' | 'active' | 'archived' | 'published'
          thumbnail_url?: string | null
          node_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workflow_nodes: {
        Row: {
          id: string
          workflow_id: string
          type: string
          position: Json
          data: Json
          style: Json
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          type: string
          position: Json
          data?: Json
          style?: Json
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          type?: string
          position?: Json
          data?: Json
          style?: Json
          parent_id?: string | null
          created_at?: string
        }
      }
      workflow_edges: {
        Row: {
          id: string
          workflow_id: string
          source_node_id: string
          target_node_id: string
          source_handle: string | null
          target_handle: string | null
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          source_node_id: string
          target_node_id: string
          source_handle?: string | null
          target_handle?: string | null
          data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          source_node_id?: string
          target_node_id?: string
          source_handle?: string | null
          target_handle?: string | null
          data?: Json
          created_at?: string
        }
      }
      workflow_versions: {
        Row: {
          id: string
          workflow_id: string
          snapshot: Json
          label: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          snapshot: Json
          label?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          snapshot?: Json
          label?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      workflow_comments: {
        Row: {
          id: string
          workflow_id: string
          node_id: string | null
          parent_id: string | null
          body: string
          created_by: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          workflow_id: string
          node_id?: string | null
          parent_id?: string | null
          body: string
          created_by?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          workflow_id?: string
          node_id?: string | null
          parent_id?: string | null
          body?: string
          created_by?: string | null
          created_at?: string
          resolved_at?: string | null
        }
      }
      workflow_activity: {
        Row: {
          id: string
          workflow_id: string
          actor_id: string | null
          action: string
          meta: Json
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          actor_id?: string | null
          action: string
          meta?: Json
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          actor_id?: string | null
          action?: string
          meta?: Json
          created_at?: string
        }
      }
      workflow_shares: {
        Row: {
          id: string
          workflow_id: string
          user_id: string | null
          role: 'editor' | 'commenter' | 'viewer'
          share_token: string | null
          expires_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          user_id?: string | null
          role: 'editor' | 'commenter' | 'viewer'
          share_token?: string | null
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          user_id?: string | null
          role?: 'editor' | 'commenter' | 'viewer'
          share_token?: string | null
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      custom_node_templates: {
        Row: {
          id: string
          workspace_id: string
          created_by: string
          name: string
          description: string | null
          base_type: string
          icon: string | null
          color: string | null
          default_data: Json
          default_style: Json
          handles: Json
          validation_schema: Json
          tags: string[]
          visibility: 'private' | 'workspace'
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          created_by: string
          name: string
          description?: string | null
          base_type: string
          icon?: string | null
          color?: string | null
          default_data?: Json
          default_style?: Json
          handles?: Json
          validation_schema?: Json
          tags?: string[]
          visibility?: 'private' | 'workspace'
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          created_by?: string
          name?: string
          description?: string | null
          base_type?: string
          icon?: string | null
          color?: string | null
          default_data?: Json
          default_style?: Json
          handles?: Json
          validation_schema?: Json
          tags?: string[]
          visibility?: 'private' | 'workspace'
          created_at?: string
        }
      }
      user_favorite_nodes: {
        Row: {
          id: string
          user_id: string
          node_type: string | null
          custom_node_template_id: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          node_type?: string | null
          custom_node_template_id?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          node_type?: string | null
          custom_node_template_id?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          workspace_id: string
          plan: 'free' | 'warrior' | 'elite' | 'champion' | 'legend'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete'
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
        }
        Insert: {
          id?: string
          workspace_id: string
          plan?: 'free' | 'warrior' | 'elite' | 'champion' | 'legend'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          status?: 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete'
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
        }
        Update: {
          id?: string
          workspace_id?: string
          plan?: 'free' | 'warrior' | 'elite' | 'champion' | 'legend'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          status?: 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete'
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
        }
      }
      ai_requests: {
        Row: {
          id: string
          workspace_id: string
          user_id: string | null
          workflow_id: string | null
          action: 'generate' | 'analyze' | 'suggest' | 'summarize' | 'layout' | 'chat'
          prompt_tokens: number
          completion_tokens: number
          credits_used: number
          status: 'success' | 'error'
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id?: string | null
          workflow_id?: string | null
          action: 'generate' | 'analyze' | 'suggest' | 'summarize' | 'layout' | 'chat'
          prompt_tokens?: number
          completion_tokens?: number
          credits_used?: number
          status?: 'success' | 'error'
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string | null
          workflow_id?: string | null
          action?: 'generate' | 'analyze' | 'suggest' | 'summarize' | 'layout' | 'chat'
          prompt_tokens?: number
          completion_tokens?: number
          credits_used?: number
          status?: 'success' | 'error'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_workspace_plan: {
        Args: {
          p_workspace_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
