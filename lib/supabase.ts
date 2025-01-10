import { createClient } from '@supabase/supabase-js'
import type { MessageType, FileAttachment } from '../types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/realtime-js'

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Add verbose logging for debugging
console.log('Environment check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  url: supabaseUrl?.slice(0, 8) + '...',  // Only log the start of the URL for security
})

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!')
  throw new Error('Missing required environment variables for Supabase configuration')
}

console.log('Initializing Supabase client with URL:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseKey)

// Add a helper function to check auth status
const checkAuth = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Auth check error:', error)
    return false
  }
  if (!session) {
    console.error('No active session')
    return false
  }
  console.log('Authenticated as:', session.user.id)
  return true
}

export const fetchMessages = async (channelId: string) => {
  console.log('lib/supabase: Fetching messages for channel:', channelId)
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

    console.log('lib/supabase: Generated SQL:', query.toSQL());

    const { data: messages, error } = await query;

    if (error) {
      console.error('lib/supabase: Messages fetch error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log('lib/supabase: Successfully fetched messages:', {
      count: messages?.length,
      firstMessage: messages?.[0],
      lastMessage: messages?.[messages?.length - 1]
    });
    return messages;
  } catch (error) {
    console.error('lib/supabase: Error fetching messages:', error);
    throw error;
  }
};

export const fetchChannelName = async (channelId: string) => {
  console.log('Fetching channel name for:', channelId)
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
      console.error('Channel fetch error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      throw error
    }

    console.log('Successfully fetched channel:', channelData?.name)
    return channelData?.name
  } catch (error) {
    console.error('Error in fetchChannelName:', error)
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
    console.error('Error sending message:', error);
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
    console.error('Error sending reply:', error);
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
    console.error('Error updating reaction:', error);
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
        console.log('New message received:', payload);
        
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
          console.error('Error fetching new message details:', error);
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
        console.log('New reply received:', payload);
        
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
          console.error('Error fetching new reply details:', error);
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
  console.log('Testing database tables...');
  try {
    // Test messages table
    const { data: messagesTest, error: messagesError } = await supabase
      .from('messages')
      .select('count', { count: 'exact', head: true });

    if (messagesError) {
      console.error('Messages table error:', messagesError);
    } else {
      console.log('Messages table exists');
    }

    // Test channels table
    const { data: channelsTest, error: channelsError } = await supabase
      .from('channels')
      .select('count', { count: 'exact', head: true });

    if (channelsError) {
      console.error('Channels table error:', channelsError);
    } else {
      console.log('Channels table exists');
    }

    // Test user_profiles table
    const { data: usersTest, error: usersError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });

    if (usersError) {
      console.error('User profiles table error:', usersError);
    } else {
      console.log('User profiles table exists');
    }

    return !messagesError && !channelsError && !usersError;
  } catch (error) {
    console.error('Error testing tables:', error);
    return false;
  }
};

export const getWorkspaces = async () => {
  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      console.error('Auth error:', authError);
      return [];
    }

    console.log('Getting workspaces for auth user:', session.user.id);

    // Get workspace details directly
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        workspace_id,
        workspaces (
          id,
          name
        ),
        role
      `)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error fetching workspaces:', error);
      return [];
    }

    console.log('Raw workspace data:', data);

    const workspaces = data.map((item: any) => ({
      id: item.workspaces.id,
      name: item.workspaces.name,
      role: item.role,
    }));

    console.log('Processed workspaces:', workspaces);
    return workspaces;
  } catch (error) {
    console.error('Error in getWorkspaces:', error);
    return [];
  }
};

const getAiUser = async () => {
  const { data: aiUser } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', 'ai.assistant@chatgenius.ai')
    .single();

  if (!aiUser) {
    console.error('AI user not found');
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

export const createWorkspace = async (name: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Get or create AI user profile
    const AI_USER_ID = '00000000-0000-0000-0000-000000000000'; // Fixed UUID for AI user

    let { data: aiUser } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'ai.assistant@chatgenius.ai')
      .single();

    if (!aiUser) {
      console.log('AI user not found, creating...');
      
      // Create the user profile with fixed ID
      const { data: newAiUser, error: aiError } = await supabase
        .from('user_profiles')
        .insert({
          id: AI_USER_ID,
          email: 'ai.assistant@chatgenius.ai',
          username: 'AI Assistant',
          status: 'online',
          avatar_url: '/ai-assistant-avatar.png'
        })
        .select()
        .single();

      if (aiError) throw aiError;
      aiUser = newAiUser;
    }

    // Create the workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name,
        created_by: session.user.id
      })
      .select()
      .single();

    if (workspaceError) throw workspaceError;

    // Add the creator as admin
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: session.user.id,
        role: 'admin'
      });

    if (memberError) throw memberError;

    // Add AI user to workspace
    await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: aiUser.id,
        role: 'member'
      });

    // Create default channels
    const channels = [];
    
    // Create general channel
    const { data: generalChannel, error: generalError } = await supabase
      .from('channels')
      .insert({
        name: 'general',
        workspace_id: workspace.id,
        created_by: session.user.id
      })
      .select()
      .single();
    
    if (generalError || !generalChannel) throw new Error('Failed to create general channel');
    channels.push(generalChannel);
    
    // Add creator to general channel members
    const { error: generalMemberError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: generalChannel.id,
        user_id: session.user.id,
        role: 'admin'
      });

    if (generalMemberError) throw new Error('Failed to add creator to general channel');

    // Add AI to general channel members
    const { error: generalAiMemberError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: generalChannel.id,
        user_id: aiUser.id,
        role: 'member'
      });

    if (generalAiMemberError) throw new Error('Failed to add AI to general channel');

    // Create intro message for general
    const { data: generalIntro, error: generalIntroError } = await supabase
      .from('messages')
      .insert({
        content: '👋 Welcome to the general channel! This is the central hub where we can discuss everything about the workspace. You can ask questions, share updates, brainstorm ideas, and collaborate with your team. Feel free to use @mentions to get someone\'s attention, share files and images, or react with emojis to messages. I\'m here to help facilitate discussions and provide assistance - just mention me in your message and I\'ll jump in! Let\'s make this a vibrant space for productive conversations and team bonding.',
        channel_id: generalChannel.id,
        user_id: session.user.id,
        file_attachments: null
      })
      .select()
      .single();

    if (generalIntroError || !generalIntro) throw new Error('Failed to create general intro message');

    // Create AI welcome reply
    const { error: aiReplyError } = await supabase
      .from('messages')
      .insert({
        content: 'Hello! I\'m your AI assistant. I\'ll be here to help you with anything you need!',
        channel_id: generalChannel.id,
        user_id: aiUser.id,
        parent_id: generalIntro.id,
        file_attachments: null
      });

    if (aiReplyError) {
      console.error('Failed to create AI welcome reply:', aiReplyError);
      throw aiReplyError;
    }

    // Create social channel
    const { data: socialChannel, error: socialError } = await supabase
      .from('channels')
      .insert({
        name: 'social',
        workspace_id: workspace.id,
        created_by: session.user.id
      })
      .select()
      .single();

    if (socialError) {
      console.error('Failed to create social channel:', socialError);
      throw socialError;
    }
    channels.push(socialChannel);

    // Add creator to social channel members
    const { error: socialMemberError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: socialChannel.id,
        user_id: session.user.id,
        role: 'admin'
      });

    if (socialMemberError) throw new Error('Failed to add creator to social channel');

    // Add AI to social channel members
    const { error: socialAiMemberError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: socialChannel.id,
        user_id: aiUser.id,
        role: 'member'
      });

    if (socialAiMemberError) throw new Error('Failed to add AI to social channel');

    // Create intro message for social
    const { data: socialIntro, error: socialIntroError } = await supabase
      .from('messages')
      .insert({
        content: 'Welcome to the social channel! 🎉 This is a space for casual conversations, team bonding, and fun discussions outside of work. Feel free to share interesting articles, memes, hobbies, weekend plans, or start conversations about anything that interests you. Building connections with your teammates is important for creating a positive work culture. Remember to keep things respectful and inclusive - we want everyone to feel comfortable participating. Looking forward to getting to know each other better! 💬',
        channel_id: socialChannel.id,
        user_id: session.user.id,
        file_attachments: null
      })
      .select()
      .single();

    if (socialIntroError || !socialIntro) throw new Error('Failed to create social intro message');

    // Create AI welcome reply for social
    const { error: aiSocialReplyError } = await supabase
      .from('messages')
      .insert({
        content: 'Looking forward to some fun conversations!',
        channel_id: socialChannel.id,
        user_id: aiUser.id,
        parent_id: socialIntro.id,
        file_attachments: null
      });

    if (aiSocialReplyError) throw new Error('Failed to create AI social welcome reply');

    // Create work channel
    const { data: workChannel, error: workError } = await supabase
      .from('channels')
      .insert({
        name: 'work',
        workspace_id: workspace.id,
        created_by: session.user.id
      })
      .select()
      .single();

    if (workError || !workChannel) throw new Error('Failed to create work channel');
    channels.push(workChannel);

    // Add creator to work channel members
    const { error: workMemberError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: workChannel.id,
        user_id: session.user.id,
        role: 'admin'
      });

    if (workMemberError) throw new Error('Failed to add creator to work channel');

    // Add AI to work channel members
    const { error: workAiMemberError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: workChannel.id,
        user_id: aiUser.id,
        role: 'member'
      });

    if (workAiMemberError) throw new Error('Failed to add AI to work channel');

    // Create intro message for work
    const { data: workIntro, error: workIntroError } = await supabase
      .from('messages')
      .insert({
        content: 'Welcome to the work channel! 🏢 This is where we discuss work-related topics, projects, tasks, and collaborate with your team. You can use this channel to share project updates, coordinate on deliverables, ask work-related questions, and keep track of important milestones. Feel free to create threads for specific topics or projects to keep discussions organized. Remember to use reactions to acknowledge updates and keep communication efficient. Let\'s build something great together! 💪',
        channel_id: workChannel.id,
        user_id: session.user.id,
        file_attachments: null
      })
      .select()
      .single();

    if (workIntroError || !workIntro) throw new Error('Failed to create work intro message');

    // Create AI welcome reply for work
    const { error: aiWorkReplyError } = await supabase
      .from('messages')
      .insert({
        content: 'I\'ll be here to help with any work-related questions!',
        channel_id: workChannel.id,
        user_id: aiUser.id,
        parent_id: workIntro.id,
        file_attachments: null
      });

    if (aiWorkReplyError) throw new Error('Failed to create AI work welcome reply');

    // Create welcome DM from AI
    const { error: welcomeDmError } = await supabase
      .from('direct_messages')
      .insert({
        content: `Welcome to your new workspace "${name}"! I'm your AI assistant. Feel free to ask me anything!`,
        sender_id: aiUser.id,
        receiver_id: session.user.id,
        file_attachments: null
      });

    if (welcomeDmError) throw new Error('Failed to create welcome DM');

    return {
      workspace,
      channels
    };

  } catch (error) {
    console.error('Error in createWorkspace:', error);
    throw error;
  }
};

export const joinWorkspace = async (workspaceId: string) => {
  try {
    const { error } = await supabase
      .rpc('join_workspace', {
        workspace_id: workspaceId
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error joining workspace:', error);
    throw error;
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

export const updateUserProfileId = async (oldEmail: string, newId: string) => {
  try {
    // First, delete the old profile
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('email', oldEmail);

    if (deleteError) {
      console.error('Error deleting old profile:', deleteError);
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
      console.error('Error creating new profile:', insertError);
      throw insertError;
    }

    console.log('Updated user profile with correct ID:', newProfile);
    return newProfile;
  } catch (error) {
    console.error('Error in updateUserProfileId:', error);
    throw error;
  }
};

export const createUserProfile = async (email: string) => {
  try {
    // Get the current session to use the auth user ID
    const { data: { session } } = await supabase.auth.getSession();

    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing profile:', fetchError);
      throw fetchError;
    }

    if (existingProfile) {
      console.log('Profile already exists:', existingProfile);
      return existingProfile;
    }

    // Extract username from email
    const username = email.split('@')[0];

    // Use the auth user ID if available
    const profileData = {
      ...(session?.user?.id ? { id: session.user.id } : {}),
      email,
      username,
      status: 'online'
    };

    console.log('Creating profile with data:', profileData);

    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert([profileData])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating profile:', insertError);
      throw insertError;
    }

    console.log('Created new profile:', newProfile);
    return newProfile;
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    throw error;
  }
};

export const getChannels = async (workspaceId: string) => {
  console.log('Fetching channels for workspace:', workspaceId)
  try {
    const isAuthed = await checkAuth()
    if (!isAuthed) {
      throw new Error('Not authenticated')
    }

    // First verify workspace access
    const { data: workspaceAccess, error: workspaceError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .limit(1);

    if (workspaceError || !workspaceAccess?.length) {
      console.error('Workspace access error:', workspaceError)
      throw workspaceError || new Error('No workspace access')
    }

    // Then fetch channels
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .eq('workspace_id', workspaceId)

    if (channelsError) {
      console.error('Channels fetch error:', {
        code: channelsError.code,
        message: channelsError.message,
        details: channelsError.details,
        hint: channelsError.hint
      })
      throw channelsError
    }

    console.log('Successfully fetched channels:', channels?.length)
    return channels || []
  } catch (error) {
    console.error('Error in getChannels:', error)
    throw error
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
    console.error('Error fetching user count:', error);
    return 0;
  }
};

export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });
    
    if (error) throw error;
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
};

export const createChannel = async (name: string, workspaceId: string) => {
  try {
    console.log('Starting channel creation:', { name, workspaceId })
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    console.log('User authenticated:', session.user.id)

    // Get AI user
    const { data: aiUser } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'ai.assistant@chatgenius.ai')
      .single();

    if (!aiUser) {
      console.error('AI user not found')
      throw new Error('AI user not found');
    }
    console.log('Found AI user:', aiUser.id)

    // Create the channel
    console.log('Creating channel in database...')
    const { data: channel, error } = await supabase
      .from('channels')
      .insert({
        name,
        workspace_id: workspaceId,
        created_by: session.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating channel in database:', error)
      throw error;
    }
    console.log('Channel created:', channel)

    // Add creator to channel members
    console.log('Adding creator to channel members...')
    const { error: memberError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: channel.id,
        user_id: session.user.id,
        role: 'admin'
      });

    if (memberError) {
      console.error('Error adding creator to channel:', memberError)
      throw memberError;
    }

    // Add AI user to channel members
    console.log('Adding AI user to channel members...')
    const { error: aiMemberError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: channel.id,
        user_id: aiUser.id,
        role: 'member'
      });

    if (aiMemberError) {
      console.error('Error adding AI to channel:', aiMemberError)
      throw aiMemberError;
    }

    // Create welcome message
    console.log('Creating welcome message...')
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

    if (welcomeError) {
      console.error('Error creating welcome message:', welcomeError)
      throw welcomeError;
    }
    console.log('Welcome message created:', welcomeMessage)

    // Create AI welcome reply
    console.log('Creating AI welcome reply...')
    const { data: aiReply, error: aiReplyError } = await supabase
      .from('messages')
      .insert({
        content: `I'll be here to help make this channel productive and engaging! Feel free to ask me any questions. 🚀`,
        channel_id: channel.id,
        user_id: aiUser.id,
        parent_id: welcomeMessage.id,
        file_attachments: null
      })
      .select()
      .single();

    if (aiReplyError) {
      console.error('Error creating AI reply:', aiReplyError)
      throw aiReplyError;
    }
    console.log('AI reply created:', aiReply)

    return channel;
  } catch (error) {
    console.error('Error in createChannel:', error)
    throw error;
  }
};

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
    console.error('Error fetching workspace users:', error);
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
    console.error('Error fetching direct messages:', error);
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
    console.error('Error fetching user profile:', error);
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
    console.error('Error sending direct message:', error);
    throw error;
  }
};

export const updateUserStatus = async (status: 'online' | 'offline' | 'away') => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ status })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user status:', error);
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
    console.error('Error updating direct message reaction:', error);
    throw error;
  }
}
