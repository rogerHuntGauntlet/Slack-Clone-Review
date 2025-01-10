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
      messages!left (
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
    const messageCount = channel.messages?.length || 0;
    const hasViews = channel.channel_views?.length > 0;
    const lastViewedAt = channel.channel_views?.[0]?.last_viewed_at;

    console.log(`📊 [getChannels] Processing channel ${channel.name}:`, {
      messageCount,
      hasViews,
      lastViewedAt
    });

    const unreadCount = lastViewedAt && messageCount > 0
      ? channel.messages.filter((msg: { created_at: string }) => 
          msg && msg.created_at && new Date(msg.created_at) > new Date(lastViewedAt)
        ).length
      : messageCount;

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
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
    
    // First verify the system user exists
    const { data: systemUser, error: systemUserError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', SYSTEM_USER_ID)
      .single();

    if (systemUserError || !systemUser) {
      console.error('System user not found:', systemUserError);
      throw new Error('System user not found. Please ensure the system user migration has been run.');
    }
    
    // Create the channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert({
        name,
        workspace_id: workspaceId,
        created_by: SYSTEM_USER_ID
      })
      .select()
      .single();

    if (channelError || !channel) {
      console.error('Error creating channel:', channelError);
      throw new Error(channelError?.message || 'Failed to create channel');
    }

    // Create welcome message
    const { data: welcomeMessage, error: welcomeError } = await supabase
      .from('messages')
      .insert({
        content: `Welcome to #${name}! This channel has been created for your team to collaborate and communicate effectively.`,
        channel_id: channel.id,
        user_id: SYSTEM_USER_ID,
        file_attachments: null,
        parent_id: null
      })
      .select()
      .single();

    if (welcomeError || !welcomeMessage) {
      console.error('Error creating welcome message:', welcomeError);
      throw new Error(`Failed to create welcome message: ${welcomeError?.message}`);
    }

    return channel;
  } catch (error) {
    console.error('Channel creation failed:', error);
    throw error;
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