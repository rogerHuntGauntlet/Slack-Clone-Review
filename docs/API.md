# RAG API Documentation

## Endpoints

### 1. Search Messages
`POST /api/rag/query`

Search through vectorized messages using semantic similarity.

#### Request
```json
{
  "query": "string",
  "filters": {
    "channels": ["string"],
    "dateRange": {
      "start": "string | null",
      "end": "string | null"
    }
  }
}
```

#### Response
```json
{
  "status": "success",
  "answer": "string",
  "sources": [
    {
      "content": "string",
      "channelName": "string",
      "timestamp": "string",
      "userId": "string"
    }
  ]
}
```

#### Error Response
```json
{
  "status": "error",
  "error": "string",
  "details?: object"
}
```

### 2. Process Messages
`POST /api/rag/process`

Vectorize and store messages for future searching.

#### Request
```json
{
  "messages": [
    {
      "content": "string",
      "channelId": "string",
      "userId": "string",
      "timestamp": "string"
    }
  ]
}
```

#### Response
```json
{
  "status": "success",
  "processed": number,
  "errors": number
}
```

## Rate Limits
- Search endpoint: 100 requests per minute per user
- Process endpoint: 1000 messages per minute per user

## Authentication
All endpoints require a valid authentication token in the Authorization header:
```
Authorization: Bearer <token>
```

## Error Codes
- `400`: Invalid request data
- `401`: Unauthorized
- `403`: Forbidden
- `404`: No results found
- `429`: Rate limit exceeded
- `500`: Internal server error

## Examples

### Search Example
```typescript
const response = await fetch('/api/rag/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    query: "What was discussed about the project timeline?",
    filters: {
      channels: ["project-updates"],
      dateRange: {
        start: "2024-01-01",
        end: "2024-01-31"
      }
    }
  })
});

const data = await response.json();
```

### Process Example
```typescript
const response = await fetch('/api/rag/process', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    messages: [
      {
        content: "Let's schedule the review for next week",
        channelId: "team-discussions",
        userId: "user123",
        timestamp: "2024-01-15T10:30:00Z"
      }
    ]
  })
});

const data = await response.json();
``` 