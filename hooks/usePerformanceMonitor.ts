import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  interactionTime: number;
}

export function usePerformanceMonitor(componentName: string) {
  const startTimeRef = useRef<number>(0);
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    interactionTime: 0
  });

  useEffect(() => {
    // Record initial render time
    const endTime = performance.now();
    metricsRef.current.renderTime = endTime - startTimeRef.current;
    
    // Report metrics
    console.debug(`[${componentName}] Initial render time:`, metricsRef.current.renderTime.toFixed(2), 'ms');

    // Setup performance observer for long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn(
              `[${componentName}] Long task detected:`,
              entry.duration.toFixed(2),
              'ms',
              entry.name
            );
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
      return () => observer.disconnect();
    }
  }, [componentName]);

  // Track interaction times
  const startInteraction = () => {
    startTimeRef.current = performance.now();
  };

  const endInteraction = (interactionName: string) => {
    const endTime = performance.now();
    const duration = endTime - startTimeRef.current;
    metricsRef.current.interactionTime = duration;
    
    console.debug(
      `[${componentName}] ${interactionName} interaction time:`,
      duration.toFixed(2),
      'ms'
    );
  };

  return {
    startInteraction,
    endInteraction
  };
} 