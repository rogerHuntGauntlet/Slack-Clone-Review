import { FC, useEffect, useState } from 'react'

interface LogDisplayProps {
  logs: string[];
}

const LogDisplay: FC<LogDisplayProps> = ({ logs }) => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="fixed top-4 left-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 px-3 py-1.5 bg-black/80 text-green-400 rounded-lg font-mono text-sm hover:bg-black/90 transition-colors flex items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        {isOpen ? 'Hide Logs' : 'Show Logs'}
      </button>

      {/* Logs Panel */}
      <div className={`
        transition-all duration-300 ease-in-out
        ${isOpen 
          ? 'opacity-100 translate-y-0 max-h-[50vh]' 
          : 'opacity-0 -translate-y-4 max-h-0 pointer-events-none'
        }
      `}>
        <div className="bg-black/80 text-green-400 p-4 rounded-lg font-mono text-sm shadow-xl overflow-y-auto">
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="text-green-600">{'>'}</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogDisplay 