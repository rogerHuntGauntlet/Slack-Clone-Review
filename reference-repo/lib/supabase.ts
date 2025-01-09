import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getWorkspaces(userId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(id, name), role')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching workspaces:', error)
    return []
  }

  return data.map((item: any) => ({
    id: item.workspaces.id,
    name: item.workspaces.name,
    role: item.role,
  }))
}

export async function createWorkspace(name: string, userId: string) {
  try {
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({ name, created_by: userId })
      .select()
      .single()

    if (workspaceError) throw workspaceError

    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: workspace.id, user_id: userId, role: 'admin' })

    if (memberError) throw memberError

    const { data, error: channelError } = await createChannel('general', workspace.id, userId)

    if (channelError) throw channelError

    return { workspace, channel: data.channel, firstMessage: data.firstMessage }
  } catch (error) {
    console.error('Error in createWorkspace:', error)
    throw error
  }
}

export async function joinWorkspace(workspaceId: string, userId: string) {
  const { error } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspaceId, user_id: userId, role: 'member' })

  if (error) {
    console.error('Error joining workspace:', error)
    throw error
  }
}

export async function getWorkspaceUsers(workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('users(id, username, email, avatar_url, status)')
    .eq('workspace_id', workspaceId)

  if (error) {
    console.error('Error fetching workspace users:', error)
    return []
  }

  return data.map((item: any) => item.users)
}

export async function updateUserStatus(userId: string, status: 'online' | 'offline' | 'away') {
  const { data, error } = await supabase
    .from('users')
    .update({ status })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user status:', error)
    return null
  }

  return data
}

export async function getChannels(workspaceId: string) {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (error) {
    console.error('Error fetching channels:', error)
    return []
  }

  return data
}

export async function getMessages(channelId: string) {
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      user_id,
      file_url,
      users:users!messages_user_id_fkey(id, username, avatar_url),
      message_reactions(id, reaction, user_id)
    `)
    .eq('channel', channelId)
    .is('is_direct_message', false)
    .order('created_at', { ascending: true })

  if (messagesError) {
    console.error('Error fetching messages:', messagesError)
    return []
  }

  const messagesWithReplies = await Promise.all(messages.map(async (message: any) => {
    const { data: replies, error: repliesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        user_id,
        users:users!messages_user_id_fkey(id, username, avatar_url)
      `)
      .eq('parent_id', message.id)
      .order('created_at', { ascending: true })

    if (repliesError) {
      console.error('Error fetching replies:', repliesError)
      return {
        ...message,
        user: message.users,
        reactions: message.message_reactions.reduce((acc: any, reaction: any) => {
          if (!acc[reaction.reaction]) {
            acc[reaction.reaction] = []
          }
          acc[reaction.reaction].push(reaction.user_id)
          return acc
        }, {}),
        replies: []
      }
    }

    return {
      ...message,
      user: message.users,
      reactions: message.message_reactions.reduce((acc: any, reaction: any) => {
        if (!acc[reaction.reaction]) {
          acc[reaction.reaction] = []
        }
        acc[reaction.reaction].push(reaction.user_id)
        return acc
      }, {}),
      replies: replies.map((reply: any) => ({
        ...reply,
        user: reply.users
      }))
    }
  }))

  return messagesWithReplies
}

export async function sendMessage(channelId: string, userId: string, content: string, fileUrl: string | null = null) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      channel: channelId,
      user_id: userId,
      content,
      is_direct_message: false,
      file_url: fileUrl
    })
    .select(`
      id,
      content,
      created_at,
      user_id,
      file_url,
      users:users!messages_user_id_fkey(id, username, avatar_url),
      message_reactions(id, reaction, user_id)
    `)
    .single()

  if (error) {
    console.error('Error sending message:', error)
    throw error
  }

  return {
    ...data,
    user: data.users,
    reactions: {},
    file_url: data.file_url
  }
}

export async function sendReply(channelId: string, userId: string, parentId: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      channel: channelId,
      user_id: userId,
      parent_id: parentId,
      content,
    })
    .select(`
      id,
      content,
      created_at,
      user_id,
      parent_id,
      users:users!messages_user_id_fkey(id, username, avatar_url)
    `)
    .single()

  if (error) {
    console.error('Error sending reply:', error)
    throw error
  }

  return {
    ...data,
    user: data.users,
  }
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user:', error)
    throw error
  }

  return data
}

export async function getDirectMessages(userId: string, otherUserId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      user_id,
      receiver_id,
      sender:users!messages_user_id_fkey(id, username, avatar_url),
      receiver:users!messages_receiver_id_fkey(id, username, avatar_url)
    `)
    .or(`and(user_id.eq.${userId},receiver_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .eq('is_direct_message', true)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching direct messages:', error)
    return []
  }

  return data
}

export async function sendDirectMessage(senderId: string, receiverId: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      user_id: senderId,
      receiver_id: receiverId,
      content,
      is_direct_message: true
    })
    .select(`
      id,
      content,
      created_at,
      user_id,
      receiver_id,
      sender:users!messages_user_id_fkey(id, username, avatar_url),
      receiver:users!messages_receiver_id_fkey(id, username, avatar_url)
    `)
    .single()

  if (error) {
    console.error('Error sending direct message:', error)
    throw error
  }

  return data
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, avatar_url, phone, bio, employer, status')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

export async function getUserCount() {
  if (!supabase) {
    console.error('Supabase client is not initialized')
    return 0
  }
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('Error fetching user count:', error)
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return 0
  }
}

export async function createChannel(name: string, workspaceId: string, creatorId: string) {
  const { data: channel, error: channelError } = await supabase
    .from('channels')
    .insert({ name, workspace_id: workspaceId, created_by: creatorId })
    .select()
    .single()

  if (channelError) {
    console.error('Error creating channel:', channelError)
    return { error: channelError }
  }

  // Create the first message in the channel
  const firstMessageContent = `Welcome to the #${name} channel!`
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({
      channel: channel.id,
      user_id: creatorId,
      content: firstMessageContent,
      is_direct_message: false
    })
    .select()
    .single()

  if (messageError) {
    console.error('Error creating first message:', messageError)
    return { error: messageError }
  }

  return { data: { channel, firstMessage: message } }
}

export async function createUserProfile(email: string) {
  try {
    const username = email.split('@')[0]; // Extract username from email
    const { data, error } = await supabase
      .from('users')
      .insert({ email, username })
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in createUserProfile:', error)
    throw error
  }
}

export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true })
    if (error) throw error
    console.log('Supabase connection successful')
    return true
  } catch (error) {
    console.error('Supabase connection failed:', error)
    return false
  }
}
