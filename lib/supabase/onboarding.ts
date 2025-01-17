import { supabase } from '../supabase'
import { logInfo as log, logError } from '../logger'
import { updateReaction } from '../supabase'
import { LogContext } from '../logger'

// Helper to create properly typed log context
function createLogContext(data: Record<string, unknown>): LogContext {
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

interface ProfileData {
  username: string
  bio?: string
  avatar_url?: string
}

interface WorkspaceData {
  name: string
  description?: string
}

interface ChannelData {
  name: string
  description?: string
}

const UNIVERSAL_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000'

export async function ensureUniversalWorkspaceMembership(userId: string) {
  try {
    const context = createLogContext({ userId })
    log('Checking OHF Community workspace membership', context)

    // First check if user is already a member
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', UNIVERSAL_WORKSPACE_ID)
      .eq('user_id', userId)
      .single()

    if (membershipError && membershipError.code !== 'PGRST116') {
      const errorContext = createLogContext({ error: membershipError.message })
      logError('Error checking workspace membership', errorContext)
      throw membershipError
    }

    // If not a member, add them
    if (!membership) {
      const { error: addError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: UNIVERSAL_WORKSPACE_ID,
          user_id: userId,
          role: 'member'
        })

      if (addError) {
        const errorContext = createLogContext({ error: addError.message })
        logError('Error adding user to OHF Community workspace', errorContext)
        throw addError
      }

      // Now get the general channel ID
      const { data: generalChannel, error: channelError } = await supabase
        .from('channels')
        .select('id')
        .eq('workspace_id', UNIVERSAL_WORKSPACE_ID)
        .eq('name', 'general')
        .single()

      if (channelError) {
        const errorContext = createLogContext({ error: channelError.message })
        logError('Error fetching general channel', errorContext)
        throw channelError
      }

      // Add user to general channel
      const { error: channelMemberError } = await supabase
        .from('channel_members')
        .insert({
          channel_id: generalChannel.id,
          user_id: userId,
          role: 'member'
        })

      if (channelMemberError) {
        const errorContext = createLogContext({ error: channelMemberError.message })
        logError('Error adding user to general channel', errorContext)
        throw channelMemberError
      }

      const addedContext = createLogContext({ userId })
      log('Added user to OHF Community workspace and general channel', addedContext)
    } else {
      const existingContext = createLogContext({ userId })
      log('User already in OHF Community workspace', existingContext)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorContext = createLogContext({ error: errorMessage })
    logError('Error in ensureUniversalWorkspaceMembership', errorContext)
    throw error
  }
}

export async function updateUserProfile(userId: string, data: ProfileData) {
  try {
    const context = createLogContext({ userId })
    log('Updating profile for user', context)

    // First create/update the profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        username: data.username,
        bio: data.bio,
        avatar_url: data.avatar_url,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      const errorContext = createLogContext({ error: error.message })
      logError('Error updating user profile', errorContext)
      throw error
    }

    // Then ensure OHF Community membership
    await ensureUniversalWorkspaceMembership(userId)

    const successContext = createLogContext({ userId })
    log('Profile updated and workspace membership verified', successContext)
    return profile
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorContext = createLogContext({ error: errorMessage })
    logError('Error in updateUserProfile', errorContext)
    throw error
  }
}

export async function createOnboardingWorkspace(userId: string, data: WorkspaceData) {
  try {
    const context = createLogContext({ name: data.name })
    log('Creating workspace', context)

    // Create the workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: data.name,
        description: data.description,
        created_by: userId
      })
      .select()
      .single()

    if (workspaceError) {
      const errorContext = createLogContext({ error: workspaceError.message })
      logError('Error creating workspace', errorContext)
      throw workspaceError
    }

    // Add user as admin
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'admin'
      })

    if (memberError) {
      const errorContext = createLogContext({ error: memberError.message })
      logError('Error adding user as admin', errorContext)
      throw memberError
    }

    const successContext = createLogContext({ workspaceId: workspace.id })
    log('Workspace created successfully', successContext)
    return workspace
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorContext = createLogContext({ error: errorMessage })
    logError('Error in createOnboardingWorkspace', errorContext)
    throw error
  }
}

export async function createOnboardingChannel(workspaceId: string, userId: string, data: ChannelData) {
  try {
    const context = createLogContext({ name: data.name })
    log('Creating channel', context)

    // Get AI user
    const { data: aiUser } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'ai.assistant@ohfpartners.com')
      .single();

    if (!aiUser) {
      const errorContext = createLogContext({ error: 'AI user not found' })
      logError('Error finding AI user', errorContext)
      throw new Error('AI user not found');
    }

    // Create the channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert({
        name: data.name,
        description: data.description,
        workspace_id: workspaceId,
        created_by: userId
      })
      .select()
      .single()

    if (channelError) {
      const errorContext = createLogContext({ error: channelError.message })
      logError('Error creating channel', errorContext)
      throw channelError
    }

    // Add creator as channel admin
    const { error: memberError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: channel.id,
        user_id: userId,
        role: 'admin'
      })

    if (memberError) {
      const errorContext = createLogContext({ error: memberError.message })
      logError('Error adding user as channel admin', errorContext)
      throw memberError
    }

    // Add AI user to channel members
    const { error: aiMemberError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: channel.id,
        user_id: aiUser.id,
        role: 'member'
      });

    if (aiMemberError) {
      const errorContext = createLogContext({ error: aiMemberError.message })
      logError('Error adding AI to channel', errorContext)
      throw aiMemberError;
    }

    // Create welcome message
    const { data: welcomeMessage, error: welcomeError } = await supabase
      .from('messages')
      .insert({
        content: `Welcome to #${data.name}! 🎉 This channel has been created as a dedicated space for your team to collaborate, share ideas, and communicate effectively. Here, you can discuss projects, share updates, ask questions, and keep everyone in the loop. Feel free to use threads for focused discussions, react with emojis to show engagement, and upload files when needed. Let's make this channel a vibrant hub of productivity and teamwork! Remember, clear communication is key to success. 🚀`,
        channel_id: channel.id,
        user_id: userId,
        file_attachments: null,
        parent_id: null
      })
      .select()
      .single()

    if (welcomeError) {
      const errorContext = createLogContext({ error: welcomeError.message })
      logError('Error creating welcome message', errorContext)
      throw welcomeError
    }

    // Create AI welcome reply
    const { data: aiReply, error: aiReplyError } = await supabase
      .from('messages')
      .insert({
        content: `Thanks for creating this channel! I'm the AI Assistant, and I'm here to help make this channel more productive and engaging! I can help with organizing discussions, providing insights, and making sure everyone stays connected. Don't hesitate to mention me if you need any assistance! 🤖✨`,
        channel_id: channel.id,
        user_id: aiUser.id,
        parent_id: welcomeMessage.id,
        file_attachments: null
      })
      .select()
      .single()

    if (aiReplyError) {
      const errorContext = createLogContext({ error: aiReplyError.message })
      logError('Error creating AI reply', errorContext)
      throw aiReplyError;
    }

    // Add reactions to both messages
    const emojis = ['👋', '🎉', '🚀', '💡', '❤️'];
    
    // Add reactions to welcome message
    for (const emoji of emojis) {
      await updateReaction(welcomeMessage.id, aiUser.id, emoji);
    }

    // Add reactions to AI reply
    for (const emoji of emojis) {
      await updateReaction(aiReply.id, aiUser.id, emoji);
    }

    const successContext = createLogContext({ channelId: channel.id })
    log('Channel created successfully', successContext)
    return channel
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorContext = createLogContext({ error: errorMessage })
    logError('Error in createOnboardingChannel', errorContext)
    throw error
  }
} 