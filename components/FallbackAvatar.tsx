import { useEffect, useState } from 'react';

interface FallbackAvatarProps {
  speaking: boolean;
  emotion?: 'neutral' | 'happy' | 'thinking' | 'surprised';
}

export function FallbackAvatar({ speaking, emotion = 'neutral' }: FallbackAvatarProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (speaking) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    } else {
      setDots('');
    }
  }, [speaking]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-800/90 backdrop-blur-sm rounded-lg">
      <div className="text-center p-4">
        <div 
          className={`w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/90 to-pink-500/90 
            backdrop-blur-sm shadow-lg border border-white/10
            ${speaking ? 'animate-pulse' : ''} 
            ${emotion === 'thinking' ? 'animate-bounce' : ''}
            ${emotion === 'happy' ? 'animate-bounce' : ''}
            ${emotion === 'surprised' ? 'scale-110 animate-pulse' : ''}`
          }
        >
          <div className="w-full h-full flex items-center justify-center">
            {/* Simple face expression based on emotion */}
            {emotion === 'neutral' && <span className="text-4xl">😐</span>}
            {emotion === 'happy' && <span className="text-4xl">😊</span>}
            {emotion === 'thinking' && <span className="text-4xl">🤔</span>}
            {emotion === 'surprised' && <span className="text-4xl">😮</span>}
          </div>
        </div>
        {speaking && (
          <div className="text-purple-300 font-mono text-sm bg-purple-500/10 px-3 py-1 rounded-full backdrop-blur-sm">
            Speaking{dots}
          </div>
        )}
      </div>
    </div>
  );
} 