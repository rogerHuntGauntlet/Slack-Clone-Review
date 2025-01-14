import { createClient } from '@supabase/supabase-js';
import { logError } from './logger';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Permission types
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
}

// Role types
export enum Role {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

interface AccessPolicy {
  role: Role;
  permissions: Permission[];
}

// Access control configuration
const accessPolicies: Record<Role, AccessPolicy> = {
  [Role.USER]: {
    role: Role.USER,
    permissions: [Permission.READ],
  },
  [Role.MODERATOR]: {
    role: Role.MODERATOR,
    permissions: [Permission.READ, Permission.WRITE],
  },
  [Role.ADMIN]: {
    role: Role.ADMIN,
    permissions: [Permission.READ, Permission.WRITE, Permission.ADMIN],
  },
};

// Cache for user roles and permissions
const userRoleCache = new Map<string, { role: Role; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to get user role from database
async function getUserRole(userId: string): Promise<Role> {
  try {
    // Check cache first
    const cached = userRoleCache.get(userId);
    if (cached && cached.expires > Date.now()) {
      return cached.role;
    }

    // Query database for user role
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    const role = (data?.role as Role) || Role.USER;

    // Update cache
    userRoleCache.set(userId, {
      role,
      expires: Date.now() + CACHE_TTL,
    });

    return role;
  } catch (error) {
    logError('Error getting user role', { error, userId });
    return Role.USER; // Default to basic user role
  }
}

// Helper to get channel permissions
async function getChannelPermissions(
  userId: string,
  channelId: string
): Promise<Permission[]> {
  try {
    const { data, error } = await supabase
      .from('channel_permissions')
      .select('permissions')
      .eq('user_id', userId)
      .eq('channel_id', channelId)
      .single();

    if (error) throw error;

    return data?.permissions || [];
  } catch (error) {
    logError('Error getting channel permissions', { error, userId, channelId });
    return []; // No special permissions
  }
}

// Main access control functions
export async function hasPermission(
  userId: string,
  permission: Permission,
  channelId?: string
): Promise<boolean> {
  try {
    const role = await getUserRole(userId);
    const policy = accessPolicies[role];

    // Check role-based permissions
    if (policy.permissions.includes(permission)) {
      return true;
    }

    // Check channel-specific permissions if channelId provided
    if (channelId) {
      const channelPermissions = await getChannelPermissions(userId, channelId);
      return channelPermissions.includes(permission);
    }

    return false;
  } catch (error) {
    logError('Permission check failed', { error, userId, permission, channelId });
    return false;
  }
}

export async function validateChannelAccess(
  userId: string,
  channelIds: string[]
): Promise<string[]> {
  try {
    const accessibleChannels = await Promise.all(
      channelIds.map(async (channelId) => {
        const hasAccess = await hasPermission(userId, Permission.READ, channelId);
        return hasAccess ? channelId : null;
      })
    );

    return accessibleChannels.filter((id): id is string => id !== null);
  } catch (error) {
    logError('Channel access validation failed', { error, userId, channelIds });
    return [];
  }
}

// Role management functions
export async function assignRole(
  adminUserId: string,
  targetUserId: string,
  role: Role
): Promise<boolean> {
  try {
    // Verify admin has permission
    const isAdmin = await hasPermission(adminUserId, Permission.ADMIN);
    if (!isAdmin) {
      throw new Error('Unauthorized role assignment');
    }

    // Update user role
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: targetUserId, role })
      .eq('user_id', targetUserId);

    if (error) throw error;

    // Clear cache for user
    userRoleCache.delete(targetUserId);

    return true;
  } catch (error) {
    logError('Role assignment failed', { error, adminUserId, targetUserId, role });
    return false;
  }
}

// Channel permission management
export async function updateChannelPermissions(
  adminUserId: string,
  targetUserId: string,
  channelId: string,
  permissions: Permission[]
): Promise<boolean> {
  try {
    // Verify admin has permission
    const isAdmin = await hasPermission(adminUserId, Permission.ADMIN, channelId);
    if (!isAdmin) {
      throw new Error('Unauthorized permission update');
    }

    // Update channel permissions
    const { error } = await supabase
      .from('channel_permissions')
      .upsert({
        user_id: targetUserId,
        channel_id: channelId,
        permissions,
      })
      .eq('user_id', targetUserId)
      .eq('channel_id', channelId);

    if (error) throw error;

    return true;
  } catch (error) {
    logError('Channel permission update failed', {
      error,
      adminUserId,
      targetUserId,
      channelId,
      permissions,
    });
    return false;
  }
} 