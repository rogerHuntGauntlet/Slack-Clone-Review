import { Workspace } from './supabase'

export interface BaseProps {
  isMobile?: boolean
}

export interface WorkspaceListProps extends BaseProps {
  workspaces: Workspace[]
  onSelectWorkspace: (workspaceId: string) => void
  onCreateWorkspace: (e: React.FormEvent) => Promise<void>
  newWorkspaceName: string
  setNewWorkspaceName: (name: string) => void
  onToggleFavorite: (workspaceId: string) => void
}

export interface HeaderProps extends BaseProps {
  currentUser: { id: string; email: string; username?: string }
  isDarkMode: boolean
  toggleDarkMode: () => void
  onCreateWorkspace: () => void
  onOpenProfile: () => void
  onLogout: () => Promise<void>
  onReturnToWorkspaceSelection: () => void
  activeWorkspaceId: string
  onSearch: (query: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  onMenuToggle?: () => void
}

export interface DMListProps extends BaseProps {
  workspaceId: string
  onSelectDMAction: (userId: string) => void
  activeUserId: string | null
  currentUserId: string
  isCollapsed: boolean
  onCollapsedChange?: (isCollapsed: boolean) => void
}

export interface SidebarProps extends BaseProps {
  activeWorkspace: string
  setActiveWorkspace: (workspaceId: string) => void
  activeChannel: string
  setActiveChannel: (channelId: string) => void
  currentUser: { id: string; email: string; username?: string }
  workspaces: { id: string; name: string; role: string }[]
}

export interface ChatAreaProps extends BaseProps {
  activeWorkspace: string
  activeChannel: string
  currentUser: { id: string; email: string; username?: string }
  onSwitchChannel: (channelId: string) => void
  userWorkspaces: string[]
  onThreadStateChange?: (isOpen: boolean) => void
}

export interface DirectMessageAreaProps extends BaseProps {
  currentUser: { id: string; email: string; username?: string }
  otherUserId: string
  isDMListCollapsed: boolean
  onClose: () => void
}

export interface ProfileModalProps extends BaseProps {
  currentUser: { id: string; email: string; username?: string }
  onClose: () => void
} 