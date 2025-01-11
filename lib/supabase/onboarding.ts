import { supabase } from '../supabase'
import logger from '../logger'

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

export async function updateUserProfile(userId: string, data: ProfileData) {
  try {
    logger.log('🔄 [updateUserProfile] Updating profile for user:', userId)

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
      logger.error('❌ [updateUserProfile] Error:', error)
      throw error
    }

    logger.log('✅ [updateUserProfile] Profile updated successfully:', profile)
    return profile
  } catch (error) {
    logger.error('❌ [updateUserProfile] Error:', error)
    throw error
  }
}

export async function createOnboardingWorkspace(userId: string, data: WorkspaceData) {
  try {
    logger.log('🏗️ [createOnboardingWorkspace] Creating workspace:', data.name)

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
      logger.error('❌ [createOnboardingWorkspace] Error creating workspace:', workspaceError)
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
      logger.error('❌ [createOnboardingWorkspace] Error adding user as admin:', memberError)
      throw memberError
    }

    logger.log('✅ [createOnboardingWorkspace] Workspace created successfully:', workspace)
    return workspace
  } catch (error) {
    logger.error('❌ [createOnboardingWorkspace] Error:', error)
    throw error
  }
}

export async function createOnboardingChannel(workspaceId: string, userId: string, data: ChannelData) {
  try {
    logger.log('📢 [createOnboardingChannel] Creating channel:', data.name)

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
      logger.error('❌ [createOnboardingChannel] Error creating channel:', channelError)
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
      logger.error('❌ [createOnboardingChannel] Error adding user as channel admin:', memberError)
      throw memberError
    }

    // Create welcome message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        channel_id: channel.id,
        user_id: userId,
        content: `Welcome to #${data.name}! ${data.description || 'This is your first channel.'}`
      })

    if (messageError) {
      logger.error('❌ [createOnboardingChannel] Error creating welcome message:', messageError)
      throw messageError
    }

    logger.log('✅ [createOnboardingChannel] Channel created successfully:', channel)
    return channel
  } catch (error) {
    logger.error('❌ [createOnboardingChannel] Error:', error)
    throw error
  }
} 