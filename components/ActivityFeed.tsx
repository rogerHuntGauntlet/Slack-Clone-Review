import { FC, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, PauseCircle, PlayCircle, ChevronLeft } from 'lucide-react'

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
  isCollapsed?: boolean;
}

const ActivityFeed: FC<ActivityFeedProps> = ({ className = '', onCollapse, isCollapsed: isCollapsedProp = false }) => {
  const [messages, setMessages] = useState<ActivityMessage[]>([])
  const [isPaused, setIsPaused] = useState(false)

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
    const timestamp = new Date()
    const newMessage: ActivityMessage = {
      id: `${timestamp.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
      content: randomMessage,
      timestamp
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
    <>
      <div className={`relative flex-shrink-0 transition-all duration-500 ease-in-out ${isCollapsedProp ? 'w-0' : 'w-80'}`}>
        {/* Main Feed Content */}
        <div className={`absolute right-0 top-0 h-full bg-gray-800 text-white flex flex-col transition-all duration-500 ease-in-out ${isCollapsedProp ? 'w-0 overflow-hidden' : 'w-full'}`}>
          <div className="flex items-center p-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 flex-shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                  <img
                    src="https://media.tenor.com/NeaT_0PBOzQAAAAM/robot-reaction-eww.gif"
                    alt="AI Assistant"
                    className="w-7 h-7 rounded-full"
                  />
                </div>
              </div>
              <span className="font-semibold">AI Feed</span>
            </div>
            <button 
              className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
              onClick={() => onCollapse?.(true)}
            >
              <ChevronRight size={16} />
            </button>
          </div>

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

          <div className="flex-grow overflow-y-auto">
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
          </div>
        </div>
      </div>

      {/* Floating Tab - Now outside the collapsible area */}
      {isCollapsedProp && (
        <div 
          className="fixed right-0 top-[4.5rem] cursor-pointer transform transition-all duration-500 ease-in-out hover:-translate-x-1 z-50"
          onClick={() => onCollapse?.(false)}
        >
          <div className="bg-gray-800 text-white p-2.5 rounded-l-xl shadow-lg flex items-center gap-2 transition-transform duration-500 ease-in-out">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                <img
                  src="https://media.tenor.com/NeaT_0PBOzQAAAAM/robot-reaction-eww.gif"
                  alt="AI Assistant"
                  className="w-7 h-7 rounded-full"
                />
              </div>
            </div>
            <ChevronLeft size={16} className="text-gray-400" />
          </div>
        </div>
      )}
    </>
  )
}

export default ActivityFeed 