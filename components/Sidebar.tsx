import { FC, useState, useEffect } from 'react'
import { User, Hash, Share2, ChevronDown, ChevronRight } from 'lucide-react'
import ChannelList from './ChannelList'
import UserStatus from './UserStatus'
import { getChannels } from '../lib/supabase'
import '../styles/sidebar.css';

interface Channel {
  id: string;
  name: string;
}

interface SidebarProps {
  activeWorkspace: string
  setActiveWorkspace: (workspaceId: string) => void
  activeChannel: string
  setActiveChannel: (channel: string) => void
  currentUser: {
    id: string
    email: string
    username?: string
  }
  workspaces: Array<{
    id: string
    name: string
    role: string
  }>
}

const Sidebar: FC<SidebarProps> = ({
  activeWorkspace,
  setActiveWorkspace,
  activeChannel,
  setActiveChannel,
  currentUser,
  workspaces
}) => {
  const [showShareLink, setShowShareLink] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [showWorkspaces, setShowWorkspaces] = useState(true)
  const [channels, setChannels] = useState<Channel[]>([])

  useEffect(() => {
    fetchChannels()
  }, [activeWorkspace])

  const fetchChannels = async () => {
    if (activeWorkspace) {
      const fetchedChannels = await getChannels(activeWorkspace)
      setChannels(fetchedChannels)
      if (fetchedChannels.length > 0 && !activeChannel) {
        setActiveChannel(fetchedChannels[0].id)
      }
    }
  }

  const handleShareWorkspace = () => {
    const link = `${window.location.origin}?workspaceId=${activeWorkspace}`
    setShareLink(link)
    setShowShareLink(true)
  }

  const currentWorkspace = workspaces.find(w => w.id === activeWorkspace)

  return (
    <div className="w-75 bg-gray-800 text-white flex flex-col h-full overflow-hidden">
      <div className="p-4">
        <h2 className="text-xl font-bold text-white">
          {currentWorkspace ? currentWorkspace.name : 'Select a Workspace'}
        </h2>
      </div>
      <div className="mb-4 px-4">
        <UserStatus currentUser={currentUser} />
      </div>
      <div className="mb-4 px-4">
        <button
          className="flex items-center text-lg font-semibold mb-2 hover:text-gray-300 transition-colors duration-200"
          onClick={() => setShowWorkspaces(!showWorkspaces)}
        >
          {showWorkspaces ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <span className="ml-1">Workspaces</span>
        </button>
        {showWorkspaces && (
          <ul className="space-y-1">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <button
                  className={`w-full text-left p-2 rounded-lg flex items-center transition-all duration-200 ${
                    activeWorkspace === workspace.id ? 'bg-gray-700' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setActiveWorkspace(workspace.id)}
                >
                  <Hash size={18} className="mr-2" />
                  {workspace.name}
                </button>
              </li>
            ))}
          </ul>
        )}
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
              <p className="text-sm mb-2">Share this link:</p>
              <input
                type="text"
                value={shareLink}
                readOnly
                className="w-full bg-gray-600 text-white p-1 rounded"
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
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
