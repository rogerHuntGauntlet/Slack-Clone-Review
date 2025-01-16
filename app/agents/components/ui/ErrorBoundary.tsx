import React, { Component, ErrorInfo } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-gray-800 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
            <h2 className="text-lg font-semibold">Something went wrong</h2>
          </div>
          <p className="text-gray-300 mb-4">
            The evaluation component encountered an error. Please try refreshing the page or contact support if the issue persists.
          </p>
          <div className="bg-gray-700 rounded p-3 font-mono text-sm">
            {this.state.error?.message}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 