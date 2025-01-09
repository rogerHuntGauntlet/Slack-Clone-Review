export type Message = {
  id: string
  content: string
  created_at: string
  user_id: string
  file_url?: string | null
  user: User
  reactions: Record<string, string[]>
  replies?: Reply[]
}

export type Reply = {
  id: string
  content: string
  created_at: string
  user_id: string
  user: User
  parent_id: string
}

export type User = {
  id: string
  username: string
  email: string
  avatar_url?: string
  status?: 'online' | 'offline' | 'away'
  phone?: string
  bio?: string
  employer?: string
}

export type Workspace = {
  id: string
  name: string
  role: 'admin' | 'member'
  isFavorite?: boolean
}

export type Channel = {
  id: string
  name: string
  workspace_id: string
  created_by: string
} 