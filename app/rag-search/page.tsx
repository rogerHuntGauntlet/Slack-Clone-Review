'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import SearchContent from './SearchContent';

// Wrapper component for search params
function SearchParamsWrapper() {
  const searchParams = useSearchParams();
  return <SearchContent searchParams={searchParams} />;
}

// Main page component
export default function RAGSearchPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    }>
      <SearchParamsWrapper />
    </Suspense>
  );
} 