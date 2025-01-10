import { FC, useEffect, useState, useRef } from 'react'

interface LogDisplayProps {
  logs: string[];
}

const LogDisplay: FC<LogDisplayProps> = ({ logs }) => {
  const [isOpen, setIsOpen] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isOpen])

  const getLogColor = (log: string): string => {
    if (log.includes('Error') || log.includes('error') || log.includes('failed')) {
      return 'text-red-400'
    }
    if (log.includes('success') || log.includes('verified') || log.includes('confirmed')) {
      return 'text-green-400'
    }
    if (log.includes('found')) {
      return 'text-blue-400'
    }
    if (log.includes('initializing') || log.includes('starting') || log.includes('testing')) {
      return 'text-yellow-400'
    }
    return 'text-gray-300'
  }

  const formatLog = (log: string) => {
    const [timestamp, ...rest] = log.split(' - ')
    const message = rest.join(' - ')
    return {
      timestamp,
      message
    }
  }

  return (
    <div className="fixed top-4 left-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 px-3 py-1.5 bg-black/80 text-green-400 rounded-lg font-mono text-sm hover:bg-black/90 transition-colors flex items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        {isOpen ? 'Hide Logs' : `Show Logs (${logs.length})`}
      </button>

      {/* Logs Panel */}
      <div className={`
        transition-all duration-300 ease-in-out max-w-2xl
        ${isOpen 
          ? 'opacity-100 translate-y-0 max-h-[50vh]' 
          : 'opacity-0 -translate-y-4 max-h-0 pointer-events-none'
        }
      `}>
        <div className="bg-black/80 text-green-400 p-4 rounded-lg font-mono text-sm shadow-xl overflow-y-auto">
          <div className="space-y-1">
            {logs.map((log, index) => {
              const { timestamp, message } = formatLog(log)
              return (
                <div key={index} className="flex items-start space-x-2 hover:bg-white/5 rounded px-1">
                  <span className="text-gray-500 flex-shrink-0">{timestamp}</span>
                  <span className="text-gray-400 flex-shrink-0">{'>'}</span>
                  <span className={getLogColor(message)}>{message}</span>
                </div>
              )
            })}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogDisplay 