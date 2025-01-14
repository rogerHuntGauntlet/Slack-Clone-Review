# RAG System Usage Guide

## Overview
The RAG (Retrieval-Augmented Generation) system allows you to search through conversation history using natural language queries. The system combines vector similarity search with AI-powered response generation.

## Features

### 1. Semantic Search
Search through messages using natural language:
```typescript
import { searchMessages } from '@/lib/rag';

// Simple search
const results = await searchMessages("What was discussed about the API design?");

// Search with filters
const results = await searchMessages("Project timeline updates", {
  channels: ["project-updates", "team-announcements"],
  dateRange: {
    start: "2024-01-01",
    end: "2024-01-31"
  }
});
```

### 2. Real-time Processing
Process and index new messages as they arrive:
```typescript
import { processMessage } from '@/lib/rag';

// Process a single message
await processMessage({
  content: "The new feature will be ready next week",
  channelId: "dev-updates",
  userId: "user123",
  timestamp: new Date().toISOString()
});

// Batch process messages
await processMessages([
  {
    content: "Meeting scheduled for Monday",
    channelId: "team-calendar",
    userId: "user456",
    timestamp: "2024-01-15T10:00:00Z"
  },
  // ... more messages
]);
```

### 3. Frontend Integration

#### React Component Example
```tsx
import { useState } from 'react';
import { useRAGSearch } from '@/hooks/useRAGSearch';

export function SearchComponent() {
  const [query, setQuery] = useState('');
  const { results, isLoading, error, search } = useRAGSearch();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await search(query);
  };

  return (
    <div>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations..."
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {results && (
        <div className="results">
          <div className="answer">{results.answer}</div>
          <div className="sources">
            {results.sources.map((source, index) => (
              <div key={index} className="source">
                <div className="content">{source.content}</div>
                <div className="metadata">
                  {source.channelName} • {new Date(source.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4. Advanced Features

#### Custom Filters
```typescript
// Create custom filter
const filter = {
  channels: ["dev-team", "product-team"],
  dateRange: {
    start: "2024-01-01",
    end: "2024-01-31"
  },
  metadata: {
    priority: "high",
    tags: ["api", "frontend"]
  }
};

// Search with custom filter
const results = await searchMessages("API documentation updates", { filter });
```

#### Streaming Responses
```typescript
import { streamingSearch } from '@/lib/rag';

// Stream search results
const stream = await streamingSearch("Project status", {
  onToken: (token) => {
    // Handle each token as it arrives
    console.log(token);
  },
  onComplete: () => {
    // Handle search completion
    console.log("Search complete");
  },
  onError: (error) => {
    // Handle any errors
    console.error("Search error:", error);
  }
});
```

### 5. Error Handling

```typescript
try {
  const results = await searchMessages("API design");
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Handle rate limiting
    console.error("Too many requests. Please try again later.");
  } else if (error.code === 'NO_RESULTS') {
    // Handle no results
    console.log("No relevant messages found.");
  } else {
    // Handle other errors
    console.error("Search failed:", error.message);
  }
}
```

### 6. Performance Tips

1. **Batch Processing**
```typescript
// Instead of processing messages one by one
for (const message of messages) {
  await processMessage(message); // ❌ Slow
}

// Process messages in batches
await processMessages(messages); // ✅ Fast
```

2. **Caching Results**
```typescript
import { createSearchCache } from '@/lib/rag';

const cache = createSearchCache({
  maxSize: 100,
  ttl: 3600 // 1 hour
});

const results = await cache.getOrFetch(
  "API design",
  () => searchMessages("API design")
);
```

3. **Optimizing Filters**
```typescript
// Narrow down search space with specific filters
const results = await searchMessages("meeting notes", {
  channels: ["team-meetings"],
  dateRange: {
    // Last 7 days only
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
});
```

## Best Practices

1. **Query Formulation**
- Be specific in your queries
- Include relevant context
- Use natural language

2. **Error Handling**
- Always implement proper error handling
- Provide user feedback
- Log errors for debugging

3. **Performance**
- Use batch processing when possible
- Implement caching for frequent queries
- Use appropriate filters

4. **Security**
- Validate user input
- Respect access controls
- Handle sensitive data appropriately 