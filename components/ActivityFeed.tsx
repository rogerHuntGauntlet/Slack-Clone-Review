import { FC, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, PauseCircle, PlayCircle } from 'lucide-react'

interface ActivityMessage {
  id: string
  content: string
  timestamp: Date
}

const SAMPLE_MESSAGES = [
  "Team collaboration is increasing in the #general channel",
  "Several important decisions were made in the #project-alpha discussion",
  "The development team has been actively sharing code snippets",
  "Good engagement in the recent technical discussion",
  "Team members are effectively using thread discussions",
  "Knowledge sharing is happening across multiple channels",
  "The team is maintaining a positive and constructive dialogue",
  "Important updates are being well-documented in the channels",
  "Cross-team collaboration is evident in recent discussions",
  "Team members are providing helpful feedback to each other"
]

interface ActivityFeedProps {
  className?: string;
  onCollapse?: (isCollapsed: boolean) => void;
}

const ActivityFeed: FC<ActivityFeedProps> = ({ className = '', onCollapse }) => {
  const [messages, setMessages] = useState<ActivityMessage[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const handleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapse?.(newCollapsed);
  };

  useEffect(() => {
    // Generate initial message
    addRandomMessage()

    // Set up interval for new messages if not paused
    const interval = setInterval(() => {
      if (!isPaused) {
        addRandomMessage()
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [isPaused])

  const addRandomMessage = () => {
    const randomMessage = SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)]
    const newMessage: ActivityMessage = {
      id: Date.now().toString(),
      content: randomMessage,
      timestamp: new Date()
    }

    setMessages(prev => [newMessage, ...prev].slice(0, 50)) // Keep last 50 messages
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  return (
    <div className={`flex-shrink-0 bg-gray-800 text-white h-full flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-80'}`}>
      <div 
        className={`flex items-center p-4 hover:bg-gray-700 transition-colors cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-between'}`}
        onClick={handleCollapse}
      >
        {!isCollapsed && <span className="text-xl font-bold">Activity Feed</span>}
        <div className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded-full hover:bg-gray-600 transition-colors">
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>
      {!isCollapsed && (
        <div className="flex items-center px-4 py-2 border-b border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation()
              togglePause()
            }}
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {isPaused ? (
              <>
                <PlayCircle size={16} />
                <span>Resume Feed</span>
              </>
            ) : (
              <>
                <PauseCircle size={16} />
                <span>Pause Feed</span>
              </>
            )}
          </button>
        </div>
      )}
      <div className="flex-grow overflow-y-auto">
        {!isCollapsed && (
          <div className="space-y-2 p-2">
            {messages.map(message => (
              <div key={message.id} className="bg-gray-700 rounded-lg p-2">
                <p className="text-sm text-gray-300">{message.content}</p>
                <p className="text-xs text-gray-400 mt-1">{formatTime(message.timestamp)}</p>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-sm text-gray-400 text-center p-4">
                Waiting for activity updates...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityFeed 