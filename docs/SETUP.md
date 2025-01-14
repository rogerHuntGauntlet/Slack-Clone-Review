# RAG System Setup Guide

## Prerequisites
- Node.js 18+ and npm
- PostgreSQL database with pgvector extension
- OpenAI API key
- Pinecone account (for vector storage)
- Sentry account (for error tracking)
- Logtail account (for logging)

## Installation

1. Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd your-project
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/your-db"

# OpenAI
OPENAI_API_KEY="your-openai-key"

# Pinecone
PINECONE_API_KEY="your-pinecone-key"
PINECONE_ENVIRONMENT="your-environment"
PINECONE_INDEX="your-index-name"

# Sentry
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"

# Logtail
LOGTAIL_SOURCE_TOKEN="your-logtail-token"

# Logging
LOG_LEVEL="info"
```

3. Initialize the database:
```bash
npx prisma generate
npx prisma db push
```

4. Create the vector index in Pinecone:
```bash
npm run setup:pinecone
```

5. Run the development server:
```bash
npm run dev
```

## Configuration Options

### Vector Database
- `PINECONE_DIMENSIONS`: Vector dimensions (default: 1536 for OpenAI embeddings)
- `PINECONE_METRIC`: Similarity metric (default: "cosine")
- `PINECONE_POD_TYPE`: Pod type for scaling (default: "p1.x1")

### LLM Settings
- `MAX_CONTEXT_TOKENS`: Maximum tokens for context window (default: 6000)
- `LLM_TEMPERATURE`: Temperature for response generation (default: 0.7)
- `LLM_MODEL`: Model to use (default: "gpt-4-turbo-preview")

### Rate Limiting
- `RATE_LIMIT_WINDOW`: Time window in seconds (default: 60)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)

## Testing

1. Run unit tests:
```bash
npm test
```

2. Run integration tests:
```bash
npm run test:e2e
```

3. Run tests with coverage:
```bash
npm run test:coverage
```

## Monitoring

1. View logs in development:
```bash
tail -f logs/combined.log
```

2. Access Sentry dashboard:
- Go to your Sentry project
- View real-time error tracking
- Monitor performance metrics

3. Access Logtail dashboard:
- View structured logs
- Set up alerts
- Monitor system health

## Troubleshooting

### Common Issues

1. Vector Database Connection
```bash
# Test Pinecone connection
npm run test:pinecone-connection
```

2. OpenAI API Issues
```bash
# Verify API key
npm run test:openai-connection
```

3. Database Issues
```bash
# Reset database
npm run db:reset
```

### Performance Optimization

1. Indexing
```bash
# Reindex all messages
npm run vectorize
```

2. Cache Management
```bash
# Clear cache
npm run cache:clear
```

## Security Best Practices

1. API Authentication
- Use secure tokens
- Implement rate limiting
- Validate all inputs

2. Data Protection
- Encrypt sensitive data
- Implement access controls
- Regular security audits

## Deployment

1. Production Build
```bash
npm run build
```

2. Start Production Server
```bash
npm start
```

3. Environment Variables
- Use production-grade secrets management
- Set appropriate rate limits
- Configure logging levels 