import { supabase } from '../supabase';
import type { MessageWithRelations } from '../../types/database';

export async function toggleReaction(messageId: string, userId: string, reaction: string) {
  const { data: existingReaction } = await supabase
    .from('message_reactions')
    .select()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('reaction', reaction)
    .single();

  if (existingReaction) {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('id', existingReaction.id);

    if (error) throw error;
    return null;
  } else {
    const { data, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        reaction
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
} 