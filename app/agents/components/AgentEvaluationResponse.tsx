import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon, BookOpenIcon, BeakerIcon, LightBulbIcon } from '@heroicons/react/24/outline';

interface Section {
  title: string;
  content: string[];
  icon: React.ReactNode;
}

interface AgentEvaluationResponseProps {
  evaluation: string;
  onAskFollowUp?: (question: string) => void;
}

export function AgentEvaluationResponse({ evaluation, onAskFollowUp }: AgentEvaluationResponseProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['Initial Assessment']);
  const [followUpQuestion, setFollowUpQuestion] = useState('');

  // Parse the evaluation text into sections
  const sections: Section[] = evaluation.split('\n').reduce((acc: Section[], line: string) => {
    // Handle both markdown headers and colon-style headers
    if (line.startsWith('###') || line.match(/^[A-Z][^a-z]*:/)) {
      // New section header
      const title = line.replace(/^###\s*/, '').replace(':', '').trim();
      acc.push({
        title,
        content: [],
        icon: getSectionIcon(title)
      });
    } else if (line.trim() && acc.length > 0) {
      // Add content to current section
      acc[acc.length - 1].content.push(line.trim());
    }
    return acc;
  }, []);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpQuestion.trim() && onAskFollowUp) {
      onAskFollowUp(followUpQuestion);
      setFollowUpQuestion('');
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <SparklesIcon className="h-6 w-6 text-white" />
          <h3 className="text-xl font-semibold text-white">Evaluation Results</h3>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-gray-700">
        {sections.map(({ title, content, icon }) => {
          const isExpanded = expandedSections.includes(title);
          return (
            <div key={title} className="transition-colors hover:bg-gray-750">
              <button
                onClick={() => toggleSection(title)}
                className="w-full px-6 py-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
                    {icon}
                  </div>
                  <span className="text-lg font-medium text-white">{title}</span>
                </div>
                {isExpanded ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {isExpanded && (
                <div className="px-6 pb-4">
                  <div className="ml-11 space-y-2">
                    {content.map((line, i) => (
                      <p
                        key={i}
                        className={`text-gray-300 ${
                          line.startsWith('-') || line.startsWith('•')
                            ? 'ml-4'
                            : ''
                        }`}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Follow-up Question Input */}
      {onAskFollowUp && (
        <div className="px-6 py-4 bg-gray-750 border-t border-gray-700">
          <form onSubmit={handleFollowUpSubmit} className="flex gap-3">
            <input
              type="text"
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={!followUpQuestion.trim()}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                !followUpQuestion.trim()
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-500'
              }`}
            >
              Ask
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function getSectionIcon(title: string) {
  switch (title) {
    case 'Initial Assessment':
      return <SparklesIcon className="h-5 w-5 text-purple-400" />;
    case 'Research Alignment':
      return <BookOpenIcon className="h-5 w-5 text-blue-400" />;
    case 'Technical Considerations':
      return <BeakerIcon className="h-5 w-5 text-green-400" />;
    case 'Recommendations':
      return <LightBulbIcon className="h-5 w-5 text-yellow-400" />;
    default:
      return <SparklesIcon className="h-5 w-5 text-gray-400" />;
  }
} 