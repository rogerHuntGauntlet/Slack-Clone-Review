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
  console.log('🆕 [createChannel] Creating new channel:', { name, workspaceId });
  
  const { data, error } = await supabase
    .from('channels')
    .insert({ name, workspace_id: workspaceId })
    .select()
    .single();

  if (error) {
    console.error('❌ [createChannel] Error creating channel:', error);
    throw error;
  }

  console.log('✅ [createChannel] Channel created successfully:', data);
  return data;
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