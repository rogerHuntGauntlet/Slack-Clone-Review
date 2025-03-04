import { FC, useState, useEffect } from 'react'
import { User, Hash, Share2, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ChannelList from './ChannelList'
import UserStatus from './UserStatus'
import { getChannels } from '../lib/supabase'
import '../styles/sidebar.css'
import type { SidebarProps } from '@/types/components'

interface Channel {
  id: string;
  name: string;
}

const Sidebar: FC<SidebarProps> = ({
  activeWorkspace,
  setActiveWorkspace,
  activeChannel,
  setActiveChannel,
  currentUser,
  workspaces,
  isMobile
}) => {
  const router = useRouter()
  const [showShareLink, setShowShareLink] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [showWorkspaces, setShowWorkspaces] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])

  useEffect(() => {
    fetchChannels()
  }, [activeWorkspace, currentUser?.id])

  const fetchChannels = async () => {
    if (activeWorkspace && currentUser?.id) {
      const fetchedChannels = await getChannels(activeWorkspace, currentUser.id)
      setChannels(fetchedChannels)
      if (fetchedChannels.length > 0 && !activeChannel) {
        setActiveChannel(fetchedChannels[0].id)
      }
    }
  }

  const handleShareWorkspace = async () => {
    const link = `${window.location.origin}/auth?workspaceId=${activeWorkspace}`
    setShareLink(link)
    setShowShareLink(true)
    try {
      await navigator.clipboard.writeText(link)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const currentWorkspace = workspaces.find(w => w.id === activeWorkspace)

  return (
    <div className="w-75 bg-gray-800 text-white flex flex-col h-full overflow-hidden pt-4">
      <div className="mb-4 px-4">
        <UserStatus currentUser={currentUser} />
      </div>
      
      {activeWorkspace && (
        <>
          <button
            onClick={handleShareWorkspace}
            className="mb-4 mx-4 bg-blue-500 text-white p-2 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
          >
            <Share2 size={18} className="mr-2" />
            Share Workspace
          </button>
          {showShareLink && (
            <div className="mb-4 mx-4 p-2 bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm">Share this link:</p>
                {copySuccess && (
                  <span className="text-green-400 text-xs">Copied to clipboard!</span>
                )}
              </div>
              <input
                type="text"
                value={shareLink}
                readOnly
                className="w-full bg-gray-600 text-white p-1 rounded cursor-pointer"
                onClick={handleShareWorkspace}
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-2 space-y-2 custom-scrollbar">
            <ChannelList
              channels={channels}
              activeChannel={activeChannel}
              onChannelSelect={setActiveChannel}
              workspaceId={activeWorkspace}
              currentUser={currentUser}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default Sidebar
