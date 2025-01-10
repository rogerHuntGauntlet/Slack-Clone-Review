import { supabase } from '../supabase';

export interface Channel {
  id: string;
  name: string;
  workspace_id: string;
  created_by: string;
  created_at: string;
  unread_count?: number;
}

interface ChannelWithRelations {
  id: string;
  name: string;
  workspace_id: string;
  created_by: string;
  created_at: string;
  messages: { created_at: string }[];
  channel_views: { last_viewed_at: string }[];
}

export async function getChannels(workspaceId: string): Promise<Channel[]> {
  console.log('🔍 [getChannels] Starting channel fetch for workspace:', workspaceId);
  
  const { data: channels, error } = await supabase
    .from('channels')
    .select(`
      *,
      messages!inner (
        created_at
      ),
      channel_views!left (
        last_viewed_at
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('name');

  if (error) {
    console.error('❌ [getChannels] Error fetching channels:', error);
    throw error;
  }

  console.log('✅ [getChannels] Raw channel data:', channels);

  // Calculate unread counts
  const channelsWithUnread = channels.map((channel: ChannelWithRelations) => {
    console.log(`📊 [getChannels] Processing channel ${channel.name}:`, {
      messageCount: channel.messages?.length || 0,
      hasViews: channel.channel_views?.length > 0,
      lastViewed: channel.channel_views?.[0]?.last_viewed_at
    });

    const lastViewedAt = channel.channel_views?.[0]?.last_viewed_at;
    const unreadCount = lastViewedAt
      ? channel.messages.filter((msg: { created_at: string }) => new Date(msg.created_at) > new Date(lastViewedAt)).length
      : channel.messages.length;

    console.log(`📬 [getChannels] Unread count for ${channel.name}:`, unreadCount);

    return {
      id: channel.id,
      name: channel.name,
      workspace_id: channel.workspace_id,
      created_by: channel.created_by,
      created_at: channel.created_at,
      unread_count: unreadCount
    };
  });

  console.log('✅ [getChannels] Final processed channels:', channelsWithUnread);
  return channelsWithUnread;
}

export async function createChannel(name: string, workspaceId: string) {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Get AI user
    const { data: aiUser } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'ai.assistant@chatgenius.ai')
      .single();

    if (!aiUser) {
      throw new Error('AI user not found');
    }

    // Create the channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert({
        name,
        workspace_id: workspaceId,
        created_by: session.user.id
      })
      .select()
      .single();

    if (channelError || !channel) {
      throw new Error(channelError?.message || 'Failed to create channel');
    }

    // Add creator to channel members
    const { error: creatorMemberError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: channel.id,
        user_id: session.user.id,
        role: 'admin'
      });

    if (creatorMemberError) {
      throw new Error(`Failed to add creator to channel: ${creatorMemberError.message}`);
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
      throw new Error(`Failed to add AI to channel: ${aiMemberError.message}`);
    }

    // Create welcome message
    const { data: welcomeMessage, error: welcomeError } = await supabase
      .from('messages')
      .insert({
        content: `Welcome to #${name}! This channel has been created for your team to collaborate and communicate effectively.`,
        channel_id: channel.id,
        user_id: session.user.id,
        file_attachments: null,
        parent_id: null
      })
      .select()
      .single();

    if (welcomeError || !welcomeMessage) {
      throw new Error(`Failed to create welcome message: ${welcomeError?.message}`);
    }

    // Create AI welcome reply
    const { error: aiReplyError } = await supabase
      .from('messages')
      .insert({
        content: `I'll be here to help make this channel productive and engaging! Feel free to ask me any questions. 🚀`,
        channel_id: channel.id,
        user_id: aiUser.id,
        parent_id: welcomeMessage.id,
        file_attachments: null
      });

    if (aiReplyError) {
      throw new Error(`Failed to create AI reply: ${aiReplyError.message}`);
    }

    return channel;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Channel creation failed: ${err.message}`);
  }
}

export async function updateChannelView(channelId: string) {
  console.log('👁️ [updateChannelView] Updating view for channel:', channelId);
  
  const user = await supabase.auth.getUser();
  console.log('👤 [updateChannelView] Current user:', user.data.user?.id);

  if (!user.data.user?.id) {
    console.error('❌ [updateChannelView] No authenticated user found');
    throw new Error('No authenticated user');
  }

  const { error } = await supabase
    .rpc('update_channel_view', {
      p_channel_id: channelId,
      p_user_id: user.data.user.id
    });

  if (error) {
    console.error('❌ [updateChannelView] Error updating channel view:', error);
    throw error;
  }

  console.log('✅ [updateChannelView] Successfully updated channel view');
} 