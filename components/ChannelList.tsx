'use client'

import { useState, useEffect } from 'react'
import { PlusCircle } from 'lucide-react'
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
        // Refresh the channel list
        const updatedChannels = await getChannels(workspaceId)
        setLocalChannels(updatedChannels)
      }
    }
  }

  return (
    <div className="w-full text-white space-y-4">
      <h2 className="text-xl font-bold mb-2">Channels</h2>
      <form onSubmit={handleAddChannel} className="mb-4 flex items-center">
        <input
          type="text"
          value={newChannel}
          onChange={(e) => setNewChannel(e.target.value)}
          placeholder="New channel"
          className="flex-grow bg-gray-700 text-white placeholder-gray-400 px-2 py-1 rounded-l"
        />
        <button type="submit" className="bg-green-500 text-white p-2 rounded-r flex-shrink-0">
          <PlusCircle size={20} />
        </button>
      </form>
       <ul
        className="flex-grow overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800
                   scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
      >
        {localChannels.map((channel) => (
          <li key={channel.id} className="mb-1">
            <button
              className={`w-full text-left p-2 rounded-lg flex items-center transition-all duration-200 ${
                activeChannel === channel.id ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
              onClick={() => onChannelSelect(channel.id)}
            >
              # {channel.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
