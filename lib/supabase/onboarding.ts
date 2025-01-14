import { supabase } from '../supabase'
import { logInfo as log, logError } from '../logger'
import { updateReaction } from '../supabase'

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

export async function updateUserProfile(userId: string, data: ProfileData) {
  try {
    log('🔄 [updateUserProfile] Updating profile for user:', userId)

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        username: data.username,
        bio: data.bio,
        avatar_url: data.avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      logError('❌ [updateUserProfile] Error:', error)
      throw error
    }

    // Add user to universal workspace
    const { error: universalError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: UNIVERSAL_WORKSPACE_ID,
        user_id: userId,
        role: 'member'
      })

    if (universalError && universalError.code !== '23505') { // Ignore if already exists
      logError('❌ [updateUserProfile] Error adding to universal workspace:', universalError)
      throw universalError
    }

    log('✅ [updateUserProfile] Profile updated successfully:', profile)
    return profile
  } catch (error) {
    logError('❌ [updateUserProfile] Error:', error)
    throw error
  }
}

export async function createOnboardingWorkspace(userId: string, data: WorkspaceData) {
  try {
    log('🏗️ [createOnboardingWorkspace] Creating workspace:', data.name)

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
      logError('❌ [createOnboardingWorkspace] Error creating workspace:', workspaceError)
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
      logError('❌ [createOnboardingWorkspace] Error adding user as admin:', memberError)
      throw memberError
    }

    log('✅ [createOnboardingWorkspace] Workspace created successfully:', workspace)
    return workspace
  } catch (error) {
    logError('❌ [createOnboardingWorkspace] Error:', error)
    throw error
  }
}

export async function createOnboardingChannel(workspaceId: string, userId: string, data: ChannelData) {
  try {
    log('📢 [createOnboardingChannel] Creating channel:', data.name)

    // Get AI user
    const { data: aiUser } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'ai.assistant@ohfpartners.com')
      .single();

    if (!aiUser) {
      logError('AI user not found')
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
      logError('❌ [createOnboardingChannel] Error creating channel:', channelError)
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
      logError('❌ [createOnboardingChannel] Error adding user as channel admin:', memberError)
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
      logError('Error adding AI to channel:', aiMemberError)
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
      logError('❌ [createOnboardingChannel] Error creating welcome message:', welcomeError)
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
      logError('Error creating AI reply:', aiReplyError)
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

    log('✅ [createOnboardingChannel] Channel created successfully:', channel)
    return channel
  } catch (error) {
    logError('❌ [createOnboardingChannel] Error:', error)
    throw error
  }
} 