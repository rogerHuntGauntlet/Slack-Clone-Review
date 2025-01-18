export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  is_public?: boolean;
  description?: string;
  member_count?: number;
  isFavorite?: boolean;
  role?: string;
}

export type Database = {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string
          content: string
          created_at: string
          channel_id: string
          user_id: string
          parent_id: string | null
          file_attachments: any[] | null
          reactions: { [key: string]: string[] } | null
        }
      }
      channels: {
        Row: {
          id: string
          name: string
          workspace_id: string
          created_by: string
          created_at: string
          description?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          description?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          username: string
          email: string
          avatar_url?: string
          status: 'online' | 'offline' | 'away'
        }
      }
    }
  }
} 