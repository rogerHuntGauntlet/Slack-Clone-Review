import { useState, useEffect } from 'react'
import { PlusCircle, Hash } from 'lucide-react'
import { createChannel, getChannels } from '../lib/supabase'

interface ChannelListProps {
  channels: Channel[];
  activeChannel: string;
  onChannelSelect: (channel: string) => void;
  workspaceId: string;
  currentUser: { id: string; email: string };
}

interface Channel {
  id: string;
  name: string;
}

export default function ChannelList({ channels, activeChannel, onChannelSelect, workspaceId, currentUser }: ChannelListProps) {
  const [newChannel, setNewChannel] = useState('')
  const [localChannels, setLocalChannels] = useState<Channel[]>(channels)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    setLocalChannels(channels)
  }, [channels])

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newChannel && !localChannels.some(channel => channel.name === newChannel) && currentUser) {
      const result = await createChannel(newChannel, workspaceId, currentUser.id)
      if (result.data) {
        const createdChannel = result.data.channel
        setLocalChannels(prevChannels => [...prevChannels, createdChannel])
        onChannelSelect(createdChannel.id)
        setNewChannel('')
        setIsAdding(false)
        // Refresh the channel list
        const updatedChannels = await getChannels(workspaceId)
        setLocalChannels(updatedChannels)
      }
    }
  }

  return (
    <div className="w-48 text-white flex flex-col h-full">
      {/* Fixed header section */}
      <div className="flex-none p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Channels</h2>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 rounded-lg hover:bg-gray-700 transition-colors"
            title="Add Channel"
          >
            <PlusCircle size={18} className="text-gray-400 hover:text-white transition-colors" />
          </button>
        </div>
        
        {isAdding && (
          <form onSubmit={handleAddChannel} className="mt-2">
            <div className="relative">
              <Hash size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                placeholder="New channel name"
                className="w-full bg-gray-700/50 text-white placeholder-gray-400 pl-7 pr-2 py-1 rounded-md 
                         border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
                         transition-all outline-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsAdding(false)
                    setNewChannel('')
                  }
                }}
                autoFocus
              />
            </div>
          </form>
        )}
      </div>

      {/* Scrollable channel list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <ul className="px-2 space-y-0.5">
          {localChannels.map((channel) => (
            <li key={channel.id}>
              <button
                className={`w-full text-left p-1.5 rounded-md flex items-center space-x-1.5 transition-all duration-200 
                           ${activeChannel === channel.id ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}
                onClick={() => onChannelSelect(channel.id)}
              >
                <Hash size={16} className="text-gray-400 flex-shrink-0" />
                <span className="truncate text-sm">{channel.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
