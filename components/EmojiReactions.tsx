import React, { useState, useEffect } from 'react'
import { Smile } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface EmojiReactionsProps {
  messageId: string
  currentUserId: string
  initialReactions: { [key: string]: string[] }
}

interface Reaction {
  reaction: string
  user_id: string
}

const EmojiReactions: React.FC<EmojiReactionsProps> = ({ messageId, currentUserId, initialReactions }) => {
  const [reactions, setReactions] = useState(initialReactions)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  useEffect(() => {
    fetchReactions()
  }, [messageId])

  const fetchReactions = async () => {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId)

    if (error) {
      console.error('Error fetching reactions:', error)
    } else {
      const groupedReactions = data.reduce((acc: { [key: string]: string[] }, reaction: Reaction) => {
        if (!acc[reaction.reaction]) {
          acc[reaction.reaction] = []
        }
        acc[reaction.reaction].push(reaction.user_id)
        return acc
      }, {})
      setReactions(groupedReactions)
    }
  }

  const handleReaction = async (emoji: string) => {
    const hasReacted = reactions[emoji]?.includes(currentUserId)

    if (hasReacted) {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUserId)
        .eq('reaction', emoji)

      if (error) {
        console.error('Error removing reaction:', error)
      } else {
        setReactions(prev => ({
          ...prev,
          [emoji]: prev[emoji].filter(id => id !== currentUserId)
        }))
      }
    } else {
      const { error } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: currentUserId, reaction: emoji })

      if (error) {
        console.error('Error adding reaction:', error)
      } else {
        setReactions(prev => ({
          ...prev,
          [emoji]: [...(prev[emoji] || []), currentUserId]
        }))
      }
    }

    setShowEmojiPicker(false)
  }

  return (
    <div className="flex items-center space-x-2">
      {Object.entries(reactions).map(([emoji, users]) => (
        users.length > 0 && (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className={`px-2 py-1 rounded-full text-sm ${
              users.includes(currentUserId) ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            {emoji} {users.length}
          </button>
        )
      ))}
      <button
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <Smile size={20} />
      </button>
      {showEmojiPicker && (
        <div className="absolute mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 z-10">
          {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
            <button
              key={emoji}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              onClick={() => handleReaction(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default EmojiReactions
