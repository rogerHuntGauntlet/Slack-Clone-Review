# RAG System Troubleshooting Guide

## Common Issues and Solutions

### 1. Search Not Returning Expected Results

#### Symptoms
- No results for relevant queries
- Irrelevant results
- Missing recent messages

#### Solutions

1. **Check Vector Index**
```bash
# Verify index status
npm run check:vector-index

# Reindex if necessary
npm run vectorize
```

2. **Verify Message Processing**
```bash
# Check processing logs
tail -f logs/combined.log | grep "message-processing"

# Monitor processing queue
npm run monitor:queue
```

3. **Optimize Search Query**
- Use more specific queries
- Check filter parameters
- Verify date ranges

### 2. Performance Issues

#### Symptoms
- Slow search responses
- High latency
- Timeouts

#### Solutions

1. **Check System Resources**
```bash
# Monitor system metrics
npm run metrics:show

# Check database connections
npm run db:status
```

2. **Optimize Vector Search**
```bash
# Analyze search patterns
npm run analyze:searches

# Adjust similarity threshold
npm run config:set SIMILARITY_THRESHOLD 0.8
```

3. **Cache Management**
```bash
# Clear cache if needed
npm run cache:clear

# Verify cache hit rate
npm run cache:stats
```

### 3. API Errors

#### Symptoms
- 429 Rate Limit Errors
- 500 Internal Server Errors
- Authentication Failures

#### Solutions

1. **Rate Limiting**
```bash
# Check current limits
npm run show:rate-limits

# Adjust if needed
npm run config:set RATE_LIMIT_MAX_REQUESTS 200
```

2. **Authentication**
```bash
# Verify token validity
npm run check:auth-token <token>

# Reset API keys if compromised
npm run reset:api-keys
```

3. **Server Errors**
```bash
# Check error logs
npm run logs:errors

# Restart services
npm run service:restart
```

### 4. Integration Issues

#### Symptoms
- Frontend not connecting
- WebSocket disconnections
- CORS errors

#### Solutions

1. **CORS Configuration**
```bash
# Verify CORS settings
npm run check:cors

# Update allowed origins
npm run config:set CORS_ORIGINS "https://your-domain.com"
```

2. **WebSocket**
```bash
# Check WebSocket status
npm run ws:status

# Reset connections
npm run ws:reset
```

3. **API Endpoints**
```bash
# Verify endpoint health
npm run health-check

# Test specific endpoint
npm run test:endpoint /api/rag/query
```

### 5. Data Issues

#### Symptoms
- Missing messages
- Duplicate entries
- Inconsistent results

#### Solutions

1. **Database Integrity**
```bash
# Run integrity check
npm run db:check

# Fix inconsistencies
npm run db:repair
```

2. **Vector Store**
```bash
# Verify vector consistency
npm run vectors:validate

# Clean up duplicates
npm run vectors:dedupe
```

3. **Data Sync**
```bash
# Check sync status
npm run sync:status

# Force resync
npm run sync:force
```

## Monitoring and Debugging

### 1. Logging

Access different log levels:
```bash
# Error logs
tail -f logs/error.log

# Debug logs
tail -f logs/debug.log

# Performance logs
tail -f logs/performance.log
```

### 2. Metrics

Monitor system health:
```bash
# Real-time metrics
npm run metrics:live

# Generate report
npm run metrics:report
```

### 3. Alerts

Configure alert thresholds:
```bash
# Set error threshold
npm run alerts:set ERROR_THRESHOLD 10

# Set latency threshold
npm run alerts:set LATENCY_THRESHOLD 1000
```

## Prevention

### 1. Regular Maintenance

```bash
# Daily health check
npm run health:daily

# Weekly optimization
npm run optimize:weekly

# Monthly cleanup
npm run cleanup:monthly
```

### 2. Monitoring

```bash
# Set up monitoring
npm run monitoring:setup

# Configure dashboards
npm run dashboards:setup
```

### 3. Backup

```bash
# Backup vector store
npm run backup:vectors

# Backup configuration
npm run backup:config
```

## Getting Help

1. **Check Logs**
- Review error logs
- Check performance metrics
- Analyze system status

2. **Documentation**
- Read API documentation
- Review setup guide
- Check usage examples

3. **Support**
- Open GitHub issue
- Contact support team
- Join community Discord 