import React, { useState, useRef, useEffect, KeyboardEvent, useMemo, useCallback, lazy, Suspense } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { usePerformanceMonitor } from '../../../hooks/usePerformanceMonitor';
import debounce from 'lodash/debounce';

// Lazy load icons
const SparklesIcon = lazy(() => import('@heroicons/react/24/outline/SparklesIcon'));
const BookOpenIcon = lazy(() => import('@heroicons/react/24/outline/BookOpenIcon'));
const BeakerIcon = lazy(() => import('@heroicons/react/24/outline/BeakerIcon'));
const LightBulbIcon = lazy(() => import('@heroicons/react/24/outline/LightBulbIcon'));

// Icon fallback
function IconFallback() {
  return <div className="w-5 h-5 rounded bg-gray-600 animate-pulse" />;
}

interface Section {
  title: string;
  content: string[];
  icon: React.ReactNode;
}

interface AgentEvaluationResponseProps {
  evaluation: string;
  onAskFollowUp?: (question: string) => void;
  isLoading?: boolean;
}

interface ValidationError {
  message: string;
  type: 'warning' | 'error';
}

function validateEvaluation(evaluation: string): ValidationError | null {
  if (!evaluation?.trim()) {
    return { message: 'Evaluation string is empty', type: 'error' };
  }

  const lines = evaluation.split('\n');
  const hasHeaders = lines.some(line => line.startsWith('###') || line.match(/^[A-Z][^a-z]*:/));
  
  if (!hasHeaders) {
    return { message: 'No valid section headers found in evaluation', type: 'error' };
  }

  return null;
}

function ErrorMessage({ error }: { error: ValidationError }) {
  return (
    <div className={`rounded-lg p-4 mb-4 ${
      error.type === 'error' ? 'bg-red-900/50' : 'bg-yellow-900/50'
    }`}>
      <div className="flex items-center gap-3">
        <ExclamationCircleIcon className={`h-5 w-5 ${
          error.type === 'error' ? 'text-red-400' : 'text-yellow-400'
        }`} />
        <p className="text-white">{error.message}</p>
      </div>
    </div>
  );
}

// Memoized section component
const Section = React.memo(function Section({
  title,
  content,
  icon,
  index,
  isExpanded,
  isToggling,
  isFocused,
  onToggle,
  onKeyDown,
  sectionRef
}: {
  title: string;
  content: string[];
  icon: React.ReactNode;
  index: number;
  isExpanded: boolean;
  isToggling: boolean;
  isFocused: boolean;
  onToggle: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  sectionRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <div 
      className="transition-colors hover:bg-gray-750"
      role="listitem"
    >
      <button
        ref={sectionRef}
        onClick={onToggle}
        onKeyDown={onKeyDown}
        className={`w-full px-6 py-4 flex items-center justify-between text-left
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset
          ${isFocused ? 'bg-gray-750' : ''}`}
        disabled={isToggling}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={`section-${index}`}
        aria-label={`${title} section ${isExpanded ? '(expanded)' : '(collapsed)'}`}
        tabIndex={0}
      >
        <div className="flex items-center gap-3">
          <div 
            className={`w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center transition-opacity
              ${isToggling ? 'opacity-50' : ''}`}
            aria-hidden="true"
          >
            {icon}
          </div>
          <span className={`text-lg font-medium text-white transition-opacity ${isToggling ? 'opacity-50' : ''}`}>
            {title}
            <span className="sr-only"> (Alt + {index + 1} to toggle)</span>
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon 
            className={`h-5 w-5 text-gray-400 transition-opacity ${isToggling ? 'opacity-50' : ''}`}
            aria-hidden="true"
          />
        ) : (
          <ChevronDownIcon 
            className={`h-5 w-5 text-gray-400 transition-opacity ${isToggling ? 'opacity-50' : ''}`}
            aria-hidden="true"
          />
        )}
      </button>
      
      {isExpanded && (
        <div 
          id={`section-${index}`}
          role="region"
          aria-label={`${title} content`}
          className={`px-6 pb-4 transition-opacity duration-150 ${isToggling ? 'opacity-50' : ''}`}
        >
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
});

export function AgentEvaluationResponse({ evaluation, onAskFollowUp, isLoading = false }: AgentEvaluationResponseProps) {
  const { startInteraction, endInteraction } = usePerformanceMonitor('AgentEvaluationResponse');
  const [expandedSections, setExpandedSections] = useState<string[]>(['Initial Assessment']);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandingSection, setExpandingSection] = useState<string | null>(null);
  const [focusedSectionIndex, setFocusedSectionIndex] = useState<number>(-1);
  const [error, setError] = useState<ValidationError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const followUpRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Status message for screen readers
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Focus trap for follow-up form
  const { focusTrapRef } = useFocusTrap({
    active: !!onAskFollowUp && document.activeElement === followUpRef.current
  });

  // Validate evaluation on mount and when it changes
  useEffect(() => {
    const validationError = validateEvaluation(evaluation);
    setError(validationError);
  }, [evaluation]);

  // Memoize section parsing logic
  const sections = useMemo(() => {
    try {
      if (error?.type === 'error') return [];

      return evaluation.split('\n').reduce((acc: Section[], line: string) => {
        if (line.startsWith('###') || line.match(/^[A-Z][^a-z]*:/)) {
          const title = line.replace(/^###\s*/, '').replace(':', '').trim();
          if (!title) throw new Error('Empty section title found');
          
          acc.push({
            title,
            content: [],
            icon: getSectionIcon(title)
          });
        } else if (line.trim() && acc.length > 0) {
          acc[acc.length - 1].content.push(line.trim());
        }
        return acc;
      }, []);
    } catch (error) {
      const e = error as Error;
      setError({ message: e.message || 'Failed to parse sections', type: 'error' });
      return [];
    }
  }, [evaluation, error?.type]);

  // Debounced section toggle
  const debouncedToggleSection = useCallback(
    debounce(async (title: string) => {
      try {
        const isExpanding = !expandedSections.includes(title);
        setExpandedSections(prev =>
          prev.includes(title)
            ? prev.filter(t => t !== title)
            : [...prev, title]
        );
        setStatusMessage(`${title} section ${isExpanding ? 'expanded' : 'collapsed'}`);
        await new Promise(resolve => setTimeout(resolve, 150));
        setExpandingSection(null);
      } catch (e) {
        setError({ message: 'Failed to toggle section. Please try again.', type: 'error' });
        setStatusMessage('Error toggling section');
      }
    }, 150),
    [expandedSections]
  );

  const toggleSection = useCallback(async (title: string) => {
    startInteraction();
    setExpandingSection(title);
    debouncedToggleSection(title);
    endInteraction('toggleSection');
  }, [debouncedToggleSection, startInteraction, endInteraction]);

  // Memoize section key handlers
  const handleSectionKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = Math.min(sections.length - 1, index + 1);
        sectionRefs.current[nextIndex]?.focus();
        setFocusedSectionIndex(nextIndex);
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = Math.max(0, index - 1);
        sectionRefs.current[prevIndex]?.focus();
        setFocusedSectionIndex(prevIndex);
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        toggleSection(sections[index].title);
        break;
      case 'Tab':
        if (e.shiftKey && index === 0) {
          setFocusedSectionIndex(-1);
        } else if (!e.shiftKey && index === sections.length - 1 && onAskFollowUp) {
          setFocusedSectionIndex(-1);
        }
        break;
    }
  }, [sections.length, onAskFollowUp, toggleSection]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Alt + number to quickly toggle sections
      if (e.altKey && !e.ctrlKey && !e.metaKey && !isSubmitting) {
        const num = parseInt(e.key);
        if (num > 0 && num <= sections.length) {
          e.preventDefault();
          toggleSection(sections[num - 1].title);
          sectionRefs.current[num - 1]?.focus();
          setFocusedSectionIndex(num - 1);
        }
      }
      // Alt + / to focus follow-up input
      if (e.altKey && e.key === '/' && onAskFollowUp && !isSubmitting) {
        e.preventDefault();
        followUpRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown as any);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown as any);
  }, [sections.length, isSubmitting, onAskFollowUp]);

  const handleRetry = () => {
    setRetryCount(count => count + 1);
    setError(null);
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpQuestion.trim() && onAskFollowUp && !isSubmitting) {
      startInteraction();
      setIsSubmitting(true);
      setStatusMessage('Sending follow-up question...');
      try {
        await onAskFollowUp(followUpQuestion);
        setFollowUpQuestion('');
        setStatusMessage('Follow-up question sent successfully');
      } catch (e) {
        const errorMessage = 'Failed to send follow-up question. Please try again.';
        setError({ message: errorMessage, type: 'error' });
        setStatusMessage(errorMessage);
      } finally {
        setIsSubmitting(false);
        endInteraction('followUpSubmit');
      }
    }
  };

  // Loading skeleton UI
  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-800 rounded-xl overflow-hidden flex flex-col animate-pulse">
          {/* Header skeleton */}
          <div className="bg-gradient-to-r from-purple-600/50 to-indigo-600/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-gray-600" />
              <div className="h-6 w-48 bg-gray-600 rounded" />
            </div>
          </div>

          {/* Section skeletons */}
          <div className="divide-y divide-gray-700">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-700" />
                  <div className="h-6 w-64 bg-gray-700 rounded" />
                </div>
                <div className="ml-11 mt-4 space-y-2">
                  <div className="h-4 w-full bg-gray-700 rounded" />
                  <div className="h-4 w-3/4 bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Follow-up input skeleton */}
          {onAskFollowUp && (
            <div className="px-6 py-4 bg-gray-750 border-t border-gray-700">
              <div className="flex gap-3">
                <div className="flex-1 h-10 bg-gray-700 rounded-lg" />
                <div className="w-20 h-10 bg-gray-700 rounded-lg" />
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div 
        ref={containerRef} 
        className="bg-gray-800 rounded-xl overflow-hidden flex flex-col"
        role="region"
        aria-label="Evaluation results"
      >
        {error && (
          <ErrorMessage error={error} />
        )}

        {error?.type === 'error' ? (
          <div className="p-6 text-center">
            <button
              onClick={handleRetry}
              disabled={retryCount >= 3}
              className={`px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500
                focus:outline-none focus:ring-2 focus:ring-purple-500
                disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed`}
            >
              {retryCount >= 3 ? 'Please refresh the page' : 'Retry'}
            </button>
          </div>
        ) : (
          <>
            {/* Status message for screen readers */}
            <div 
              role="status" 
              aria-live="polite" 
              className="sr-only"
            >
              {statusMessage}
            </div>

            {/* Header */}
            <div 
              className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4"
              role="banner"
            >
              <div className="flex items-center gap-3">
                <Suspense fallback={<IconFallback />}>
                  <SparklesIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </Suspense>
                <h1 className="text-xl font-semibold text-white">Evaluation Results</h1>
              </div>
            </div>

            {/* Sections */}
            <div 
              className="divide-y divide-gray-700"
              role="list"
              aria-label="Evaluation sections"
            >
              {sections.map((section, index) => (
                <Section
                  key={section.title}
                  {...section}
                  index={index}
                  isExpanded={expandedSections.includes(section.title)}
                  isToggling={expandingSection === section.title}
                  isFocused={focusedSectionIndex === index}
                  onToggle={() => toggleSection(section.title)}
                  onKeyDown={(e) => handleSectionKeyDown(e, index)}
                  sectionRef={el => { sectionRefs.current[index] = el; }}
                />
              ))}
            </div>

            {/* Follow-up Question Input */}
            {onAskFollowUp && (
              <div 
                ref={focusTrapRef} 
                className="px-6 py-4 bg-gray-750 border-t border-gray-700"
                role="complementary"
                aria-label="Follow-up question form"
              >
                <form 
                  ref={formRef} 
                  onSubmit={handleFollowUpSubmit} 
                  className="flex gap-3"
                  aria-label="Ask a follow-up question"
                >
                  <input
                    ref={followUpRef}
                    type="text"
                    value={followUpQuestion}
                    onChange={(e) => setFollowUpQuestion(e.target.value)}
                    placeholder="Ask a follow-up question... (Alt + / to focus)"
                    className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 
                      focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={isSubmitting}
                    aria-label="Follow-up question"
                    aria-invalid={followUpQuestion.trim() === ''}
                  />
                  <button
                    type="submit"
                    disabled={!followUpQuestion.trim() || isSubmitting}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors
                      focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      !followUpQuestion.trim() || isSubmitting
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-500'
                    }`}
                    aria-busy={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Ask'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

function getSectionIcon(title: string) {
  return (
    <Suspense fallback={<IconFallback />}>
      {(() => {
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
      })()}
    </Suspense>
  );
} 