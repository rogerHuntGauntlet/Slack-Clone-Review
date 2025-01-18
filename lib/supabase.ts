import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import type { MessageType, FileAttachment } from '../types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/realtime-js'
import { logInfo, logError, logWarning, logDebug, type LogContext } from '@/lib/logger'
import { md5 } from './md5'

// Helper function to safely cast unknown to string
function safeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

// Helper function to create a properly typed log context
function createLogContext(data: Record<string, unknown> | null | undefined): LogContext {
  if (!data) {
    return {};
  }
  const context: LogContext = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      context[key] = null;
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      context[key] = value;
    } else if (Array.isArray(value)) {
      context[key] = value.map(String);
    } else if (typeof value === 'object') {
      context[key] = value as Record<string, unknown>;
    } else {
      context[key] = String(value);
    }
  }
  return context;
}

interface WorkspaceData {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  description?: string;
  is_public: boolean;
}

interface WorkspaceMemberData {
  workspace: WorkspaceData;
}

interface MessagePayload {
  id: string;
  content: string;
  created_at: string;
  channel: string;
  user_id: string;
  parent_id: string | null;
  is_direct_message: boolean;
  file_attachments: FileAttachment[];
  reactions: { [key: string]: string[] };
  thread_ts: string | null;
  reply_count: number;
  last_reply_at: string | null;
  is_inline_thread: boolean;
}

type RealtimeMessagePayload = RealtimePostgresChangesPayload<MessagePayload> & {
  new: MessagePayload;
}

interface MessageInsertPayload {
  new: {
    id: string;
  };
  old: null;
  eventType: 'INSERT';
}

interface MessageReactionPayload {
  new: {
    id: string;
    reactions: { [key: string]: string[] };
  };
  old: {
    id: string;
    reactions: { [key: string]: string[] };
  } | null;
  eventType: 'UPDATE';
}

interface SystemUser {
  id: string;
  username: string;
  email: string;
  status: string;
  avatar_url: string;
}

logInfo('🔧 [Supabase] Starting Supabase initialization...');

// Create a singleton instance
let supabaseInstance: ReturnType<typeof createClientComponentClient> | null = null

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClientComponentClient()
  }
  return supabaseInstance
}

export const supabase = getSupabaseClient();

export const testSupabaseConnection = async () => {
  try {
    logInfo('🔄 [Supabase] Testing connection...', { action: 'test_connection' });
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });

    if (error) {
      logError('❌ [Supabase] Connection test error:', { error: safeString(error.message) });
      throw error;
    }
    logInfo('✅ [Supabase] Connection test successful', { status: 'success' });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('❌ [Supabase] Connection test failed:', { error: errorMessage });
    return false;
  }
};

// Add a helper function to check auth status
const checkAuth = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    logError('Auth check error:', { error: safeString(error.message) })
    return false
  }
  if (!session) {
    logError('No active session', { error: 'No session found' })
    return false
  }
  logInfo('Authenticated as:', { userId: session.user.id })
  return true
}

export const fetchMessages = async (channelId: string) => {
  logInfo('lib/supabase: Fetching messages for channel:', { channelId, action: 'fetch_messages' })
  try {
    const isAuthed = await checkAuth()
    if (!isAuthed) {
      throw new Error('Not authenticated')
    }

    // Direct query to messages with user join
    const query = supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        channel_id,
        user_id,
        parent_id,
        file_attachments,
        user:user_profiles (
          id,
          username,
          avatar_url
        )
      `)
      .eq('channel_id', channelId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    const sql = safeString(query.toSQL());
    logDebug('lib/supabase: Generated SQL:', { sql });

    const { data: messages, error } = await query;

    if (error) {
      logError('lib/supabase: Messages fetch error:', {
        error: safeString(error.message),
        code: safeString(error.code),
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    logInfo('lib/supabase: Successfully fetched messages:', {
      count: messages?.length ?? 0,
      firstMessageId: messages?.[0]?.id ?? '',
      lastMessageId: messages?.[messages?.length - 1]?.id ?? ''
    });
    return messages;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('lib/supabase: Error fetching messages:', { error: errorMessage });
    throw error;
  }
};

export const fetchChannelName = async (channelId: string) => {
  logInfo('Fetching channel name for:', createLogContext({ channelId }))
  try {
    const isAuthed = await checkAuth()
    if (!isAuthed) {
      throw new Error('Not authenticated')
    }

    // Simple direct query to channels
    const { data: channelData, error } = await supabase
      .from('channels')
      .select('name')
      .eq('id', channelId)
      .single()

    if (error) {
      logError('Channel fetch error:', createLogContext({
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      }))
      throw error
    }

    logInfo('Successfully fetched channel:', createLogContext({ name: channelData?.name }))
    return channelData?.name
  } catch (error) {
    logError('Error in fetchChannelName:', createLogContext({ error }))
    throw error
  }
}

export const sendMessage = async (
  channelId: string,
  userId: string,
  content: string,
  fileAttachments: FileAttachment[] | null = null,
  parentId: string | null = null
) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        content,
        channel_id: channelId,
        user_id: userId,
        parent_id: parentId,
        file_attachments: fileAttachments
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        channel_id,
        user_id,
        parent_id,
        file_attachments,
        user:user_profiles (
          id,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error sending message:', createLogContext({ error: errorMessage }));
    throw error;
  }
};

export const sendReply = async (
  channelId: string,
  userId: string,
  parentId: string,
  content: string
) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        content,
        channel_id: channelId,
        user_id: userId,
        parent_id: parentId,
        file_attachments: null
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        channel_id,
        user_id,
        parent_id,
        file_attachments,
        user:user_profiles (
          id,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error sending reply:', createLogContext({ error: errorMessage }));
    throw error;
  }
};

export const updateReaction = async (messageId: string, userId: string, emoji: string) => {
  try {
    // First get current reactions
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    // Get current reactions or initialize empty object
    const currentReactions = message?.reactions || {};
    const userReactions = currentReactions[emoji] || [];
    const hasReacted = userReactions.includes(userId);

    // Update reactions
    let updatedReactions = { ...currentReactions };
    if (hasReacted) {
      // Remove reaction
      updatedReactions[emoji] = userReactions.filter((id: string) => id !== userId);
      if (updatedReactions[emoji].length === 0) {
        delete updatedReactions[emoji];
      }
    } else {
      // Add reaction
      updatedReactions[emoji] = [...userReactions, userId];
    }

    // Update the message
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({ reactions: updatedReactions })
      .eq('id', messageId)
      .select('reactions')
      .single();

    if (updateError) throw updateError;
    return updatedMessage.reactions;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error updating reaction:', createLogContext({ error: errorMessage }));
    throw error;
  }
}

export const subscribeToChannel = (
  channelId: string,
  onMessage: (message: MessageType) => void,
  onReply: (reply: MessageType) => void,
  onReaction: (messageId: string, reactions: { [key: string]: string[] }) => void
) => {
  // Subscribe to new messages
  const messageChannel = supabase
    .channel(`messages:${channelId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId} and parent_id=is.null`
      },
      async (payload: RealtimeMessagePayload) => {
        logInfo('New message received:', payload);

        try {
          const { data: newMessage, error } = await supabase
            .from('messages')
            .select(`
              *,
              user:user_profiles (
                id,
                username,
                avatar_url
              ),
              replies:messages!messages_parent_id_fkey (
                id,
                content,
                created_at,
                user_id,
                user:user_profiles (
                  id,
                  username,
                  avatar_url
                )
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) throw error;

          if (newMessage) {
            onMessage(newMessage);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logError('Error fetching new message details:', createLogContext({ error: errorMessage }));
        }
      }
    )
    .subscribe();

  // Subscribe to new replies
  const replyChannel = supabase
    .channel(`replies:${channelId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId} and parent_id=is.not.null`
      },
      async (payload: RealtimeMessagePayload) => {
        logInfo('New reply received:', payload);

        try {
          const { data: newReply, error } = await supabase
            .from('messages')
            .select(`
              *,
              user:user_profiles (
                id,
                username,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) throw error;

          if (newReply) {
            onReply(newReply);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logError('Error fetching new reply details:', createLogContext({ error: errorMessage }));
        }
      }
    )
    .subscribe();

  // Subscribe to reaction changes
  const reactionChannel = supabase
    .channel(`reactions:${channelId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      },
      (payload: MessageReactionPayload) => {
        if (payload.new.reactions) {
          onReaction(payload.new.id, payload.new.reactions);
        }
      }
    )
    .subscribe();

  return () => {
    messageChannel.unsubscribe();
    replyChannel.unsubscribe();
    reactionChannel.unsubscribe();
  };
}

export const testDatabaseTables = async () => {
  try {
    // Test workspaces table
    await supabase.from('workspaces').select('*').limit(1)
    logInfo('Workspaces table exists')

    // Ensure universal workspace exists
    await ensureUniversalWorkspace()
    logInfo('Universal workspace verified')

    // Test channels table
    await supabase.from('channels').select('*').limit(1)
    logInfo('Channels table exists')

    // Test messages table
    await supabase.from('messages').select('*').limit(1)
    logInfo('Messages table exists')

    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error testing database tables:', createLogContext({ error: errorMessage }));
    throw error;
  }
}

export const getWorkspaces = async (userId?: string) => {
  try {
    logInfo('🏢 [getWorkspaces] Starting to fetch workspaces...', createLogContext({ action: 'fetch_workspaces' }));

    // If userId is provided, get only their workspaces
    if (userId) {
      const { data: workspaces, error } = await supabase
        .from('workspace_members')
        .select(`
          role,
          workspace:workspaces (
            id,
            name,
            created_at,
            created_by,
            is_public,
            description,
            member_count:workspace_members!inner (
              user_id
            )
          )
        `)
        .eq('user_id', userId);

      if (error) {
        logError('❌ [getWorkspaces] Database error:', createLogContext({ error: error.message }));
        throw error;
      }

      // Transform the data to match the expected format
      const transformedWorkspaces = (workspaces as any[]).map(w => {
        // Filter out agent users and count remaining members
        const memberCount = w.workspace.member_count?.filter((m: any) => 
          m.user_id !== '00000000-0000-0000-0000-000000000001' && 
          m.user_id !== '00000000-0000-0000-0000-000000000002'
        ).length || 0;

        return {
          id: w.workspace.id,
          name: w.workspace.name,
          role: w.role,
          is_public: w.workspace.is_public,
          created_by: w.workspace.created_by,
          description: w.workspace.description,
          member_count: memberCount
        };
      });

      logInfo(`✅ [getWorkspaces] Fetched ${workspaces.length} workspaces for user`, createLogContext({ count: workspaces.length }));
      return transformedWorkspaces;
    }

    return [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('❌ [getWorkspaces] Error:', createLogContext({ error: errorMessage }));
    return [];
  }
};

const getAiUser = async () => {
  const { data: aiUser } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', 'ai.assistant@ohfpartners.com')
    .single();

  if (!aiUser) {
    logError('AI user not found');
    throw new Error('AI user not found');
  }

  return aiUser;
};

const createWorkspaceChannel = async (name: 'general' | 'social' | 'work', workspaceId: string, creatorId: string, aiUserId: string) => {
  // Create channel
  const { data: channel } = await supabase
    .from('channels')
    .insert({
      name,
      workspace_id: workspaceId,
      created_by: creatorId
    })
    .select()
    .single();

  // Create intro message
  const introMessages = {
    'general': 'Welcome to the general channel! This is where we discuss everything about the workspace.',
    'social': 'This is our social space! Share fun stuff, memes, and get to know each other.',
    'work': 'Welcome to the work channel! This is where we focus on tasks and projects.'
  } as const;

  const { data: introMessage } = await supabase
    .from('messages')
    .insert({
      content: introMessages[name],
      channel: channel.id,
      user_id: creatorId,
      is_direct_message: false
    })
    .select()
    .single();

  // AI reply
  const { data: aiReply } = await supabase
    .from('messages')
    .insert({
      content: `Thanks for creating this channel! I'm the AI Assistant, and I'm here to help make this workspace more productive and fun! 🚀`,
      channel: channel.id,
      user_id: aiUserId,
      is_direct_message: false
    })
    .select()
    .single();

  // AI reactions
  const emojis = ['👍', '🎉', '🚀', '💡', '❤️'];
  for (const message of [introMessage, aiReply]) {
    for (const emoji of emojis) {
      await supabase.rpc('handle_reaction', {
        message_id: message.id,
        user_id: aiUserId,
        emoji: emoji
      });
    }
  }

  return channel;
};

const createAiWelcomeDm = async (workspaceName: string, creatorId: string, aiUserId: string) => {
  // Initial welcome message
  const { data: dmMessage } = await supabase
    .from('direct_messages')
    .insert({
      content: `Hi there! 👋 I'm your AI Assistant. I noticed you just created the "${workspaceName}" workspace. I'm here to help you make the most of it! Feel free to ask me any questions about setting up channels, inviting team members, or using any of our features. Good luck with your new workspace! 🚀`,
      sender_id: aiUserId,
      receiver_id: creatorId
    })
    .select()
    .single();

  // AI reactions to its own message
  for (const emoji of ['👋', '🎉', '🤖']) {
    await supabase.rpc('handle_reaction', {
      message_id: dmMessage.id,
      user_id: aiUserId,
      emoji: emoji
    });
  }

  // Follow-up message about channels
  await supabase
    .from('direct_messages')
    .insert({
      content: `By the way, I've already set up three channels for you: #general for team-wide announcements, #social for casual conversations, and #work for project discussions. Each channel has some starter messages to help get things going! 📚`,
      sender_id: aiUserId,
      receiver_id: creatorId
    });
};

export const createWorkspace = async (name: string, userId?: string) => {
  try {
    logInfo('🏢 [createWorkspace] Starting workspace creation:', createLogContext({ name, userId }))

    // Check userId
    if (!userId) {
      logError('❌ [createWorkspace] No userId provided')
      throw new Error('User ID is required to create a workspace')
    }
    logInfo('✅ [createWorkspace] UserId validation passed')

    // Check if workspace exists
    logInfo('🔍 [createWorkspace] Checking if workspace exists:', createLogContext({ name }));
    const { data: existingWorkspace, error: existingWorkspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('name', name.trim())
      .single();

    if (existingWorkspace) {
      logError('❌ [createWorkspace] Workspace already exists:', createLogContext(existingWorkspace))
      throw new Error('A workspace with this name already exists')
    }

    if (existingWorkspaceError && existingWorkspaceError.code !== 'PGRST116') {
      logError('❌ [createWorkspace] Error checking existing workspace:', createLogContext(existingWorkspaceError))
      throw existingWorkspaceError
    }
    logInfo('✅ [createWorkspace] Workspace name is available')

    // Get system users
    logInfo('🤖 [createWorkspace] Fetching system users...')
    let { data: systemUsers, error: systemError }: { data: SystemUser[] | null, error: any } = await supabase
      .from('user_profiles')
      .select('id, username, email')
      .in('id', ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002']);

    if (systemError) {
      logError('❌ [createWorkspace] Database error fetching system users:', createLogContext({ error: systemError }))
      throw new Error(`Failed to fetch system users: ${systemError.message}`)
    }

    logInfo('🔍 [createWorkspace] Found system users:', createLogContext({ 
      count: systemUsers?.length || 0,
      users: systemUsers 
    }))

    // Create missing system users if needed
    const requiredUsers: SystemUser[] = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'ai.assistant',
        email: 'ai.assistant@ohfpartners.com',
        status: 'online',
        avatar_url: 'https://www.gravatar.com/avatar/00000000000000000000000000000001?d=identicon'
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        username: 'bro.assistant',
        email: 'bro.assistant@ohfpartners.com',
        status: 'online',
        avatar_url: 'https://www.gravatar.com/avatar/00000000000000000000000000000002?d=identicon'
      }
    ];

    const existingIds = new Set(systemUsers?.map((u: { id: string }) => u.id) || []);
    const missingUsers = requiredUsers.filter((u: SystemUser) => !existingIds.has(u.id));

    if (missingUsers.length > 0) {
      logInfo('🔧 [createWorkspace] Creating missing system users:', createLogContext({ 
        missingCount: missingUsers.length,
        missingIds: missingUsers.map(u => u.id)
      }));

      const { data: createdUsers, error: createError } = await supabase
        .from('user_profiles')
        .upsert(missingUsers)
        .select();

      if (createError) {
        logError('❌ [createWorkspace] Failed to create system users:', createLogContext({ error: createError }))
        throw new Error(`Failed to create system users: ${createError.message}`)
      }

      if (!createdUsers) {
        logError('❌ [createWorkspace] No users were created')
        throw new Error('Failed to create system users: No users were created')
      }

      logInfo('✅ [createWorkspace] Created missing system users:', createLogContext({ 
        createdCount: createdUsers.length,
        createdIds: createdUsers.map((u: { id: string }) => u.id)
      }))

      // Merge existing and created users
      systemUsers = [...(systemUsers || []), ...createdUsers];
    }

    if (!systemUsers || systemUsers.length !== 2) {
      logError('❌ [createWorkspace] Invalid number of system users:', createLogContext({ 
        count: systemUsers?.length,
        expectedCount: 2,
        actualUsers: systemUsers
      }))
      throw new Error('Invalid number of system users found')
    }

    const aiUser = systemUsers.find((u: { id: string }) => u.id === '00000000-0000-0000-0000-000000000001')
    const broUser = systemUsers.find((u: { id: string }) => u.id === '00000000-0000-0000-0000-000000000002')

    if (!aiUser || !broUser) {
      logError('❌ [createWorkspace] Missing required system users:', createLogContext({
        aiUserFound: !!aiUser,
        broUserFound: !!broUser,
        systemUsers
      }))
      throw new Error('Missing required system users')
    }

    logInfo('✅ [createWorkspace] System users verified:', createLogContext({ 
      aiUserId: aiUser.id,
      broUserId: broUser.id
    }))

    // Create the workspace
    logInfo('🏢 [createWorkspace] Creating workspace...')
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name,
        created_by: userId
      })
      .select()
      .single()

    if (workspaceError) {
      logError('❌ [createWorkspace] Error creating workspace:', createLogContext(workspaceError))
      throw workspaceError
    }
    logInfo('✅ [createWorkspace] Workspace created:', createLogContext(workspace))

    // Add members
    logInfo('👥 [createWorkspace] Adding members to workspace...')
    const { error: memberError } = await supabase
      .from('workspace_members')
      .upsert([
        {
          workspace_id: workspace.id,
          user_id: userId,
          role: 'admin'
        },
        {
          workspace_id: workspace.id,
          user_id: aiUser.id,
          role: 'member'
        },
        {
          workspace_id: workspace.id,
          user_id: broUser.id,
          role: 'member'
        }
      ], {
        onConflict: 'workspace_id,user_id',
        ignoreDuplicates: true
      })

    if (memberError) {
      logError('❌ [createWorkspace] Failed to add members:', createLogContext(memberError))
      throw memberError
    }
    logInfo('✅ [createWorkspace] Members added successfully')

    // Create channels array
    logInfo('📝 [createWorkspace] Creating default channels...')

    // Create general channel
    let generalChannel = await createChannel(
      workspace.id,
      'general',
      userId,
      'This is the general channel for the workspace.'
    ) 

    let socialChannel = await createChannel(
      workspace.id,
      'social',
      userId,
      'This is the social channel for the workspace.'
    ) 

    let workChannel = await createChannel(
      workspace.id,
      'work',
      userId,
      'This is the work channel for the workspace.'
    ) 

    const channels = [generalChannel, socialChannel, workChannel]

    // Add members to general channel
   
    logInfo('✅ [createWorkspace] Members added to general channel')

    logInfo('🎉 [createWorkspace] Workspace setup completed successfully:', createLogContext({
      workspaceId: workspace.id,
      channelCount: channels.length
    }));
    return {
      workspace,
      channels
    }

  } catch (error) {
    if (error instanceof Error) {
      logError('❌ [createWorkspace] Error:', createLogContext({ error: error.message }));
    } else {
      logError('❌ [createWorkspace] Error:', createLogContext({ error: 'Unknown error' }));
    }
    throw error;
  }
}

export const joinWorkspace = async (workspaceId: string, userId: string) => {
  try {
    const { error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role: 'member'
      })

    if (error) throw error
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error joining workspace:', createLogContext({ error: errorMessage }));
    throw error;
  }
}

export const getUserByEmail = async (email: string) => {
  try {
    // Get the profile using the email
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error fetching user:', createLogContext({ error: errorMessage }));
    return null;
  }
}

export const updateUserProfileId = async (oldEmail: string, newId: string) => {
  try {
    // First, delete the old profile
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('email', oldEmail);

    if (deleteError) {
      logError('Error deleting old profile:', deleteError);
      throw deleteError;
    }

    // Then create a new profile with the correct ID
    const username = oldEmail.split('@')[0];
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert([{
        id: newId,
        email: oldEmail,
        username,
        status: 'online'
      }])
      .select()
      .single();

    if (insertError) {
      logError('Error creating new profile:', insertError);
      throw insertError;
    }

    logInfo('Updated user profile with correct ID:', newProfile);
    return newProfile;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error in updateUserProfileId:', createLogContext({ error: errorMessage }));
    throw error;
  }
};

export const createUserProfile = async (user: { id: string; email?: string }) => {
  try {
    logInfo('Creating user profile:', { userId: user.id })
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      logInfo('Profile already exists:', { userId: user.id })
      return existingProfile
    }

    // Generate avatar URL using Gravatar
    const gravatarUrl = user.email
      ? `https://www.gravatar.com/avatar/${md5(user.email.toLowerCase().trim())}?d=identicon`
      : 'https://www.gravatar.com/avatar/default?d=identicon'

    const { data: profile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email,
        username: user.email?.split('@')[0] || 'anonymous',
        avatar_url: gravatarUrl,
        status: 'online',
        last_seen: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      logError('Error creating profile:', { error: insertError })
      throw insertError
    }

    logInfo('Profile created successfully:', { userId: user.id })
    return profile
  } catch (error) {
    logError('Error in createUserProfile:', { error })
    throw error
  }
}

export const getChannels = async (workspaceId: string, userId: string) => {
  try {
    logInfo(`Getting channels for workspace ${workspaceId} and user ${userId}`)

    if (!workspaceId || !userId) {
      logError('Missing required parameters:', createLogContext({ workspaceId, userId }))
      return [] // Return empty array instead of throwing
    }

    // First verify workspace access
    const { data: members, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    if (memberError) {
      if (memberError.code === 'PGRST116') { // No rows returned
        logInfo('User is not a member of this workspace:', createLogContext({ userId, workspaceId }))
        return [] // Return empty array for non-members
      }
      logError('Error checking workspace membership:', memberError)
      throw memberError
    }

    // Then fetch channels
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select(`
        id,
        name,
        workspace_id,
        created_by,
        created_at
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })

    if (channelsError) {
      logError('Error fetching channels:', channelsError)
      throw channelsError
    }

    logInfo(`Successfully fetched ${channels?.length || 0} channels`)
    return channels || []
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error in getChannels:', createLogContext({ error: errorMessage }));
    return [];
  }
}

export const getUserCount = async () => {
  try {
    const { count, error } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error fetching user count:', createLogContext({ error: errorMessage }));
    return 0;
  }
};

export const createChannel = async (
  workspaceId: string,
  name: string,
  userId: string,
  description?: string
) => {
  try {
    logInfo('🏗️ [createChannel] Starting channel creation:', createLogContext({ workspaceId, name }))

    // Get system users
    const { data: systemUsers, error: systemError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002']);

    if (systemError || !systemUsers || systemUsers.length !== 2) {
      logError('❌ [createChannel] Error getting system users:', systemError)
      throw new Error('System users not found')
    }

    const aiUser = systemUsers.find((u: { id: string }) => u.id === '00000000-0000-0000-0000-000000000001')
    const broUser = systemUsers.find((u: { id: string }) => u.id === '00000000-0000-0000-0000-000000000002')

    // Create the channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert({
        workspace_id: workspaceId,
        name,
        description,
        created_by: userId
      })
      .select()
      .single()

    if (channelError) {
      logError('❌ [createChannel] Error creating channel:', channelError)
      throw channelError
    }

    // Add members
    const { error: memberError } = await supabase
      .from('channel_members')
      .insert([
        {
          channel_id: channel.id,
          user_id: userId,
          role: 'admin'
        },
        {
          channel_id: channel.id,
          user_id: aiUser.id,
          role: 'member'
        },
        {
          channel_id: channel.id,
          user_id: broUser.id,
          role: 'member'
        }
      ])

    if (memberError) {
      logError('❌ [createChannel] Error adding members:', memberError)
      throw memberError
    }

    // Create welcome message
    const { data: welcomeMessage } = await supabase
      .from('messages')
      .insert({
        content: `Welcome to #${name}! This channel was created by <@${userId}>.${description ? ` Channel description: ${description}` : ''}`,
        channel_id: channel.id,
        user_id: userId,
        file_attachments: null,
        parent_id: null
      })
      .select()
      .single()

    // Create AI reply
    const { data: aiReply } = await supabase
      .from('messages')
      .insert({
        content: `Thanks for creating this channel! I'm here to help make discussions more productive and engaging. Feel free to mention me if you need any assistance! 🤖✨`,
        channel_id: channel.id,
        user_id: aiUser.id,
        parent_id: welcomeMessage.id,
        file_attachments: null
      })
      .select()
      .single()

    // Add reactions
    const emojis = ['👋', '🎉', '🚀', '💡', '❤️'];
    for (const emoji of emojis) {
      await supabase.rpc('handle_reaction', {
        message_id: welcomeMessage.id,
        user_id: aiUser.id,
        emoji: emoji
      });
      await supabase.rpc('handle_reaction', {
        message_id: aiReply.id,
        user_id: aiUser.id,
        emoji: emoji
      });
    }

    logInfo('✅ [createChannel] Channel created successfully:', channel)
    return channel

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('❌ [createChannel] Error:', createLogContext({ error: errorMessage }));
    throw error;
  }
}

export const getWorkspaceUsers = async (workspaceId: string) => {
  try {
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        user_id,
        role,
        user_profiles:user_id (
          id,
          username,
          email,
          avatar_url,
          status
        )
      `)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return data.map((item: any) => ({
      ...item.user_profiles,
      role: item.role
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error fetching workspace users:', createLogContext({ error: errorMessage }));
    return [];
  }
};

export const getDirectMessages = async (userId: string, otherUserId: string) => {
  try {
    const { data: messages, error } = await supabase
      .from('direct_messages')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        sender_id,
        receiver_id,
        parent_id,
        file_attachments,
        sender:user_profiles!sender_id (
          id,
          username,
          avatar_url
        ),
        receiver:user_profiles!receiver_id (
          id,
          username,
          avatar_url
        )
      `)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return messages;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error fetching direct messages:', createLogContext({ error: errorMessage }));
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error fetching user profile:', createLogContext({ error: errorMessage }));
    return null;
  }
};

export const sendDirectMessage = async (
  senderId: string,
  receiverId: string,
  content: string,
  fileAttachments: FileAttachment[] | null = null,
  parentId: string | null = null
) => {
  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        content,
        sender_id: senderId,
        receiver_id: receiverId,
        parent_id: parentId,
        file_attachments: fileAttachments
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        sender_id,
        receiver_id,
        parent_id,
        file_attachments,
        sender:user_profiles!sender_id (
          id,
          username,
          avatar_url
        ),
        receiver:user_profiles!receiver_id (
          id,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error sending direct message:', createLogContext({ error: errorMessage }));
    throw error;
  }
};

export const updateUserStatus = async (status: 'online' | 'offline' | 'away', userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ status })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error updating user status:', createLogContext({ error: errorMessage }));
    throw error;
  }
};

export const updateDirectMessageReaction = async (messageId: string, userId: string, emoji: string) => {
  try {
    // First get current reactions
    const { data: message, error: fetchError } = await supabase
      .from('direct_messages')
      .select('reactions')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    // Get current reactions or initialize empty object
    const currentReactions = message?.reactions || {};
    const userReactions = currentReactions[emoji] || [];
    const hasReacted = userReactions.includes(userId);

    // Update reactions
    let updatedReactions = { ...currentReactions };
    if (hasReacted) {
      // Remove reaction
      updatedReactions[emoji] = userReactions.filter((id: string) => id !== userId);
      if (updatedReactions[emoji].length === 0) {
        delete updatedReactions[emoji];
      }
    } else {
      // Add reaction
      updatedReactions[emoji] = [...userReactions, userId];
    }

    // Update the message
    const { data: updatedMessage, error: updateError } = await supabase
      .from('direct_messages')
      .update({ reactions: updatedReactions })
      .eq('id', messageId)
      .select('reactions')
      .single();

    if (updateError) throw updateError;
    return updatedMessage.reactions;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error updating direct message reaction:', createLogContext({ error: errorMessage }));
    throw error;
  }
}

const UNIVERSAL_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000'
const UNIVERSAL_WORKSPACE_NAME = 'OHF Community'

const addAllUsersToUniversalWorkspace = async () => {
  try {
    logInfo('Adding all users to universal workspace...')

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id')

    if (usersError) {
      logError('Error fetching users:', usersError)
      throw usersError
    }

    // Add each user to the universal workspace
    for (const user of users) {
      await addUserToUniversalWorkspace(user.id)
    }

    logInfo(`Added ${users.length} users to universal workspace`)
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error adding all users to universal workspace:', createLogContext({ error: errorMessage }));
    throw error;
  }
}

const createDefaultChannels = async (workspaceId: string) => {
  try {
    const { data: systemUsers } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002']);

    if (!systemUsers || systemUsers.length !== 2) {
      throw new Error('System users not found');
    }

    const aiUser = systemUsers.find((u: { id: string }) => u.id === '00000000-0000-0000-0000-000000000001');
    const broUser = systemUsers.find((u: { id: string }) => u.id === '00000000-0000-0000-0000-000000000002');

    if (!aiUser) {
      throw new Error('AI user not found');
    }

    // Create default channels
    const channels = ['general', 'announcements', 'random'];
    for (const channelName of channels) {
      await createChannel(workspaceId, channelName, aiUser.id);
    }

    return true;
  } catch (error) {
    if (error instanceof Error) {
      logError('Error creating default channels:', createLogContext({ error: error.message }));
    } else {
      logError('Error creating default channels:', createLogContext({ error: 'Unknown error' }));
    }
    throw error;
  }
};

export const ensureUniversalWorkspace = async () => {
  try {
    // Check if universal workspace exists
    const { data: workspace, error: fetchError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', UNIVERSAL_WORKSPACE_ID)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      logError('Error fetching universal workspace:', fetchError)
      throw fetchError
    }

    // If workspace doesn't exist, create it
    if (!workspace) {
      logInfo('Creating universal workspace...')
      const { error: createError } = await supabase
        .from('workspaces')
        .insert({
          id: UNIVERSAL_WORKSPACE_ID,
          name: UNIVERSAL_WORKSPACE_NAME,
          description: 'A workspace for all users',
          created_at: new Date().toISOString()
        })

      if (createError) {
        logError('Error creating universal workspace:', createError)
        throw createError
      }

      // Create default channels
      await createDefaultChannels(UNIVERSAL_WORKSPACE_ID)
      logInfo('Universal workspace created successfully')

      // Add all existing users
      await addAllUsersToUniversalWorkspace()
    }

    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error ensuring universal workspace:', createLogContext({ error: errorMessage }));
    throw error;
  }
}

export const addUserToUniversalWorkspace = async (userId: string) => {
  try {
    // Check if user is already a member
    const { data: membership, error: fetchError } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', UNIVERSAL_WORKSPACE_ID)
      .eq('user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      logError('Error checking universal workspace membership:', fetchError)
      throw fetchError
    }

    // If not a member, add them
    if (!membership) {
      logInfo(`Adding user to universal workspace`)
      await supabase
        .from('workspace_members')
        .insert({
          workspace_id: UNIVERSAL_WORKSPACE_ID,
          user_id: userId,
          role: 'member'
        })
    }

    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error adding user to universal workspace:', createLogContext({ error: errorMessage }));
    throw error;
  }
}

export const updateWorkspace = async (workspaceId: string, updates: { is_public?: boolean, description?: string }) => {
  try {
    logInfo('Updating workspace:', createLogContext({ workspaceId, updates }))

    const { data, error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', workspaceId)
      .select()
      .single()

    if (error) {
      logError('Error updating workspace:', createLogContext({ error }))
      throw error
    }

    logInfo('Workspace updated successfully:', createLogContext({ workspaceId }))
    return data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logError('Error in updateWorkspace:', createLogContext({ error: errorMessage }))
    throw error
  }
}