'use client';

import { useState, useEffect } from 'react';

const healthSuggestions = [
  "Take a sip of water 💧",
  "Stretch your legs 🦵",
  "Roll your shoulders 🔄",
  "Look away from screen (20-20-20 rule) 👀",
  "Take a deep breath 🫁",
  "Fix your posture 🧍",
  "Blink your eyes slowly 😌",
  "Wiggle your toes 🦶",
  "Stretch your wrists 🤚",
  "Stand up for a moment 🚶"
];

export function HealthReminder() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === healthSuggestions.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-3 rounded-lg shadow-lg transition-all duration-300 hover:bg-purple-700">
      <p className="text-sm font-medium">
        {healthSuggestions[currentIndex]}
      </p>
    </div>
  );
} 