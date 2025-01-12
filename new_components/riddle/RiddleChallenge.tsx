"use client";

import React, { useState } from 'react';

interface RiddleChallengeProps {
  className?: string;
}

const RiddleChallenge: React.FC<RiddleChallengeProps> = ({ className = '' }) => {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);

  const checkAnswer = () => {
    setAttempts(prev => prev + 1);
    
    // This is a simple example - you can make the riddle more complex
    if (answer.toLowerCase() === 'time') {
      setFeedback('Congratulations! You solved the riddle!');
      setIsCorrect(true);
    } else {
      setFeedback('Not quite right. Try again!');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <p className="text-lg font-medium mb-2">
          Solve this riddle for a special reward:
        </p>
        <p className="italic text-blue-100/90">
          "I am not a bird, but I fly. I am not a plane, but I soar. 
          I have no eyes, but I cry. What am I?"
        </p>
      </div>

      {!isCorrect && (
        <div className="flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer..."
            className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white placeholder-blue-100/50 border border-white/20 focus:outline-none focus:border-white/40"
          />
          <button
            onClick={checkAnswer}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Submit
          </button>
        </div>
      )}

      {feedback && (
        <p className={`text-sm ${isCorrect ? 'text-green-300' : 'text-blue-100/80'}`}>
          {feedback}
        </p>
      )}

      {attempts > 2 && !isCorrect && (
        <p className="text-sm text-blue-100/60">
          Hint: It falls but never breaks, runs but never walks.
        </p>
      )}
    </div>
  );
};

export default RiddleChallenge; 