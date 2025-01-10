import { useState, useEffect } from 'react'
import { Plus, Hash } from 'lucide-react'
import { createChannel, getChannels, updateChannelView } from '../lib/supabase/channels'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'

interface ChannelListProps {
  channels: Channel[]
  activeChannel: string
  onChannelSelect: (channel: string) => void
  workspaceId: string
  currentUser: { id: string; email: string }
}

interface Channel {
  id: string
  name: string
  unread_count?: number
}

export default function ChannelList({ channels, activeChannel, onChannelSelect, workspaceId, currentUser }: ChannelListProps) {
  const [newChannel, setNewChannel] = useState('')
  const [localChannels, setLocalChannels] = useState<Channel[]>(channels)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLocalChannels(channels)
  }, [channels])

  const handleChannelSelect = async (channelId: string) => {
    onChannelSelect(channelId)
    try {
      await updateChannelView(channelId)
      setLocalChannels(prevChannels =>
        prevChannels.map(channel =>
          channel.id === channelId
            ? { ...channel, unread_count: 0 }
            : channel
        )
      )
    } catch (error) {
      toast.error('Failed to update channel view')
    }
  }

  const validateChannelName = (name: string) => {
    if (!name) return 'Channel name is required'
    if (name.length < 2) return 'Channel name must be at least 2 characters'
    if (name.length > 80) return 'Channel name must be less than 80 characters'
    if (!/^[a-z0-9-_]+$/.test(name)) return 'Channel name can only contain lowercase letters, numbers, hyphens, and underscores'
    if (localChannels.some(channel => channel.name === name)) return 'Channel name already exists'
    return null
  }

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate channel name
    const validationError = validateChannelName(newChannel)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    try {
      const result = await createChannel(newChannel, workspaceId)
      
      if (!result) {
        throw new Error('Failed to create channel')
      }

      // Update local state
      const createdChannel = {
        id: result.id,
        name: result.name,
        unread_count: 0
      }
      
      setLocalChannels(prevChannels => [...prevChannels, createdChannel])
      onChannelSelect(createdChannel.id)
      setNewChannel('')
      setIsCreating(false)
      toast.success('Channel created successfully!')

      // Refresh channel list
      const updatedChannels = await getChannels(workspaceId)
      setLocalChannels(updatedChannels)
    } catch (err) {
      const error = err as Error
      setError(error.message)
      toast.error('Failed to create channel')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between px-2 py-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase">Channels</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 hover:bg-gray-700/50 rounded transition-colors"
          title="Create Channel"
        >
          <Plus size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="space-y-0.5">
        {localChannels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => handleChannelSelect(channel.id)}
            className={`
              w-full px-2 py-1 text-left flex items-center space-x-2 rounded-md transition-colors
              ${activeChannel === channel.id 
                ? 'bg-gray-700/75 text-white' 
                : 'text-gray-300 hover:bg-gray-700/50 hover:text-gray-100'}
            `}
          >
            <Hash size={15} className="flex-shrink-0 text-gray-400" />
            <span className="truncate">{channel.name}</span>
            {channel.unread_count ? (
              <span className="ml-auto bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">
                {channel.unread_count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Create Channel Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => !isLoading && setIsCreating(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700"
            >
              <h3 className="text-lg font-semibold mb-4 text-white">Create Channel</h3>
              <form onSubmit={handleAddChannel} className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 p-2 bg-gray-700/50 rounded-lg border border-gray-600">
                    <Hash size={16} className="text-gray-400" />
                    <input
                      type="text"
                      value={newChannel}
                      onChange={(e) => {
                        setNewChannel(e.target.value.toLowerCase())
                        setError(null)
                      }}
                      placeholder="new-channel"
                      className="bg-transparent text-white placeholder-gray-400 flex-1 outline-none"
                      autoFocus
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' && !isLoading) {
                          setIsCreating(false)
                          setNewChannel('')
                        }
                      }}
                    />
                  </div>
                  {error && (
                    <p className="mt-2 text-sm text-red-400">{error}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    Channel names can only contain lowercase letters, numbers, hyphens, and underscores.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: isLoading ? 1 : 1.01 }}
                    whileTap={{ scale: isLoading ? 1 : 0.99 }}
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      </div>
                    ) : (
                      'Create'
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
