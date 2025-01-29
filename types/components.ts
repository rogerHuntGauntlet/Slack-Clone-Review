import { Workspace } from './supabase'

export interface BaseProps {
  isMobile?: boolean
}

export interface WorkspaceListProps extends BaseProps {
  workspaces: Workspace[]
  onSelectWorkspace: (workspaceId: string) => void
  onCreateWorkspace: (e: React.FormEvent, isPublic: boolean) => Promise<void>
  newWorkspaceName: string
  setNewWorkspaceName: (name: string) => void
  onToggleFavorite: (workspaceId: string) => void
  onTogglePublic: (workspaceId: string) => void
  error?: string | null
  success?: string | null
  isCreatingWorkspace?: boolean
  currentUserId: string
  onUpdateDescription: (workspaceId: string, description: string) => void
}

export interface HeaderProps extends BaseProps {
  currentUser: { id: string; email: string; username?: string }
  isDarkMode: boolean
  toggleDarkMode: () => void
  onCreateWorkspace?: () => void
  onOpenProfile: () => void
  onLogout: () => Promise<void>
  onReturnToWorkspaceSelection?: () => void
  activeWorkspaceId?: string
  workspaceName?: string
  onSearch?: (query: string) => Promise<SearchResult[]>
  searchQuery?: string
  setSearchQuery?: (query: string) => void
  onMenuToggle?: () => void
  onOpenRoadmap?: () => void
  onSearchResultClick?: (result: SearchResult) => void
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
  mediaConfig?: {
    upload: MediaUploadConfig;
    camera: CameraConfig;
  };
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

// Media Types
export interface MediaUploadConfig {
  maxSize: number;
  allowedTypes: string[];
  uploadPath: string;
}

export interface CameraConfig {
  quality: number;
  facingMode: 'user' | 'environment';
  aspectRatio: number;
}

export interface MediaPreviewProps {
  url: string;
  type: string;
  onRemove: () => void;
  uploadProgress?: number;
}

export interface CameraModalProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  config?: CameraConfig;
}

export interface MediaUploadButtonProps {
  onUpload: (files: File[]) => void;
  config: MediaUploadConfig;
  disabled?: boolean;
  children?: React.ReactNode;
}

export interface SearchResult {
  id: string;
  content: string;
  channel_id: string;
  user_id: string;
  channels: {
    id: string;
    name: string;
  };
  user_profiles: {
    username: string;
    email: string;
  };
  created_at: string;
} 