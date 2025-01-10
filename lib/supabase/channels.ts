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

  if (error) throw error;

  // Calculate unread counts
  const channelsWithUnread = channels.map((channel: ChannelWithRelations) => {
    const lastViewedAt = channel.channel_views?.[0]?.last_viewed_at;
    const unreadCount = lastViewedAt
      ? channel.messages.filter((msg: { created_at: string }) => new Date(msg.created_at) > new Date(lastViewedAt)).length
      : channel.messages.length;

    return {
      id: channel.id,
      name: channel.name,
      workspace_id: channel.workspace_id,
      created_by: channel.created_by,
      created_at: channel.created_at,
      unread_count: unreadCount
    };
  });

  return channelsWithUnread;
}

export async function createChannel(name: string, workspaceId: string) {
  const { data, error } = await supabase
    .from('channels')
    .insert({ name, workspace_id: workspaceId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateChannelView(channelId: string) {
  const { error } = await supabase
    .rpc('update_channel_view', {
      p_channel_id: channelId,
      p_user_id: (await supabase.auth.getUser()).data.user?.id
    });

  if (error) throw error;
} 