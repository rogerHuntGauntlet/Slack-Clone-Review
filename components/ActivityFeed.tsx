import { FC, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, PauseCircle, PlayCircle, ChevronLeft, UserPlus, Bot } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type UserProfile = Tables['user_profiles']['Row']

interface ActivityItem {
  id: string
  type: 'new_user' | 'new_agent'
  content: string
  timestamp: Date
  details: {
    name: string
    avatar_url?: string | null
  }
}

interface Agent {
  id: string
  name: string
  created_at: string
}

interface ActivityFeedProps {
  className?: string;
}

const ActivityFeed: FC<ActivityFeedProps> = ({ className = '' }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Set up realtime subscriptions for new users and agents
    const channel = supabase.channel('activity_feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_profiles'
        },
        (payload: { new: UserProfile }) => {
          if (!isPaused) {
            const newUser: ActivityItem = {
              id: payload.new.id,
              type: 'new_user',
              content: 'New user joined the platform',
              timestamp: new Date(),
              details: {
                name: payload.new.username || payload.new.email?.split('@')[0] || 'Anonymous',
                avatar_url: payload.new.avatar_url
              }
            }
            setActivities(prev => [...prev.slice(-19), newUser])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agents'
        },
        (payload: { new: Agent }) => {
          if (!isPaused) {
            const newAgent: ActivityItem = {
              id: payload.new.id,
              type: 'new_agent',
              content: 'New agent created',
              timestamp: new Date(),
              details: {
                name: payload.new.name || 'Unnamed Agent'
              }
            }
            setActivities(prev => [...prev.slice(-19), newAgent])
          }
        }
      )
      .subscribe()

    // Fetch initial activities
    const fetchInitialActivities = async () => {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('*')
        .order('id', { ascending: false })
        .limit(10)

      const { data: agents } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      const userActivities: ActivityItem[] = (users || []).map((user: UserProfile) => ({
        id: user.id,
        type: 'new_user',
        content: 'New user joined the platform',
        timestamp: new Date(),
        details: {
          name: user.username || user.email?.split('@')[0] || 'Anonymous',
          avatar_url: user.avatar_url
        }
      }))

      const agentActivities: ActivityItem[] = (agents || []).map((agent: Agent) => ({
        id: agent.id,
        type: 'new_agent',
        content: 'New agent created',
        timestamp: new Date(agent.created_at),
        details: {
          name: agent.name || 'Unnamed Agent'
        }
      }))

      // Combine and sort by timestamp
      const allActivities = [...userActivities, ...agentActivities]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20)

      setActivities(allActivities)
    }

    fetchInitialActivities()

    return () => {
      channel.unsubscribe()
    }
  }, [isPaused])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  return (
    <div className={`h-full flex flex-col border-l border-gray-200 dark:border-gray-700 ${
      isCollapsed ? 'w-[50px]' : 'w-[15vw]'
    } ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1 transition-colors"
          >
            {isCollapsed ? 
              <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" /> : 
              <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            }
          </button>
          {!isCollapsed && <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Feed</h2>}
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isPaused ? <PlayCircle size={20} /> : <PauseCircle size={20} />}
          </button>
        )}
      </div>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className="bg-white dark:bg-gray-700/50 rounded-lg p-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                {activity.type === 'new_user' ? (
                  <UserPlus className="w-5 h-5 text-blue-500" />
                ) : (
                  <Bot className="w-5 h-5 text-purple-500" />
                )}
                <div className="flex-1">
                  <p className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                    {activity.details.name}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {activity.content}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatTime(activity.timestamp)}
              </p>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="text-sm text-gray-400 text-center p-4">
              No recent activity...
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ActivityFeed 