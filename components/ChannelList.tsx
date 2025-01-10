import { useState, useEffect } from 'react'
import { Plus, Hash } from 'lucide-react'
import { createChannel, getChannels } from '../lib/supabase'
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
}

export default function ChannelList({ channels, activeChannel, onChannelSelect, workspaceId, currentUser }: ChannelListProps) {
  const [newChannel, setNewChannel] = useState('')
  const [localChannels, setLocalChannels] = useState<Channel[]>(channels)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setLocalChannels(channels)
  }, [channels])

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newChannel && !localChannels.some(channel => channel.name === newChannel) && currentUser) {
      setIsLoading(true)
      try {
        console.log('Creating channel:', { name: newChannel, workspaceId })
        const result = await createChannel(newChannel, workspaceId)
        console.log('Channel creation result:', result)

        if (!result) {
          throw new Error('No result returned from createChannel')
        }

        // Create a channel object from the result
        const createdChannel = {
          id: result.id,
          name: result.name
        }

        console.log('Created channel:', createdChannel)
        
        // Update local state
        setLocalChannels(prevChannels => [...prevChannels, createdChannel])
        onChannelSelect(createdChannel.id)
        setNewChannel('')
        setIsCreating(false)

        // Refresh the channel list
        try {
          console.log('Fetching updated channel list')
          const updatedChannels = await getChannels(workspaceId)
          console.log('Updated channels:', updatedChannels)
          setLocalChannels(updatedChannels)
        } catch (refreshError) {
          console.error('Error refreshing channel list:', refreshError)
          toast.error('Channel created but failed to refresh the list')
        }
      } catch (err) {
        const error = err as Error
        console.error('Error creating channel:', error)
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
        toast.error('Failed to create channel')
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Channels</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreating(true)}
            className="p-1 hover:bg-gray-700 rounded-md transition-colors"
          >
            <Plus size={20} className="text-gray-400 hover:text-gray-200" />
          </motion.button>
        </div>
      </div>

      {/* Scrollable Channel List */}
      <div className="flex-1 overflow-y-auto -mr-2 pr-2 custom-scrollbar">
        <AnimatePresence>
          {localChannels.map((channel, index) => (
            <motion.button
              key={channel.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`w-full text-left p-2 rounded-lg flex items-center gap-2 mb-1 transition-all duration-200 group ${
                activeChannel === channel.id 
                  ? 'bg-gray-700/80 text-white' 
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
              }`}
              onClick={() => onChannelSelect(channel.id)}
            >
              <Hash size={16} className="flex-shrink-0" />
              <span className="truncate">{channel.name}</span>
            </motion.button>
          ))}
        </AnimatePresence>
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
                      onChange={(e) => setNewChannel(e.target.value)}
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
                  <p className="mt-2 text-xs text-gray-400">Channel names can't contain spaces or special characters.</p>
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
