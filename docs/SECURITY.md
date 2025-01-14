# Security Documentation

## Overview
This document outlines the security measures implemented in the RAG system, including authentication, authorization, rate limiting, and data validation.

## Authentication
- JWT-based authentication required for all RAG endpoints
- Token format validation using regex pattern
- Token expiration and refresh mechanism
- Secure token storage in HTTP-only cookies

## Authorization
### Role-Based Access Control (RBAC)
Three primary roles are defined:
- **USER**: Basic read access
- **MODERATOR**: Read and write access
- **ADMIN**: Full system access including user management

### Permissions
Available permissions:
- `READ`: View messages and search results
- `WRITE`: Process new messages and modify existing ones
- `ADMIN`: Manage users, roles, and system settings

### Channel-Specific Permissions
- Granular access control at the channel level
- Permissions can be assigned per user per channel
- Cached permission checks for performance

## Rate Limiting
- Redis-based rate limiting implementation
- Limits per endpoint:
  - `/api/rag/query`: 100 requests per minute
  - `/api/rag/process`: 50 requests per minute
- Rate limit headers included in responses
- Graceful handling of limit exceeded cases

## Input Validation & Sanitization
### Request Validation
- Zod schema validation for all requests
- Type checking and constraint validation
- Custom validation error handling

### Content Sanitization
- HTML/script content removal
- Control character filtering
- Input length restrictions
- Safe string handling

## Error Handling
- Structured error responses
- Detailed error logging
- No sensitive information in error messages
- Graceful fallback mechanisms

## Database Security
- Prepared statements for all queries
- Input sanitization before storage
- Role-based database access
- Connection pooling with timeouts

## Testing
### Unit Tests
- Validation function tests
- Permission check tests
- Token format validation tests
- Error handling tests

### Integration Tests
- End-to-end API tests
- Rate limiting tests
- Authentication flow tests
- Permission escalation tests

## Best Practices
1. Always validate user input
2. Use principle of least privilege
3. Implement proper error handling
4. Regular security audits
5. Keep dependencies updated

## Configuration
```typescript
// Rate limiting configuration
const RATE_LIMITS = {
  search: {
    window: '1m',
    max: 100
  },
  process: {
    window: '1m',
    max: 50
  }
};

// Permission configuration
const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin'
};

// Role configuration
const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};
```

## Example Usage

### Authentication Check
```typescript
// Middleware example
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!validateTokenFormat(token)) {
    return res.status(401).json({ error: 'Invalid token format' });
  }
  // Continue with token verification...
}
```

### Permission Check
```typescript
// Permission check example
async function checkPermission(userId: string, action: string, channelId?: string) {
  const hasAccess = await hasPermission(userId, action, channelId);
  if (!hasAccess) {
    throw new Error('Insufficient permissions');
  }
}
```

## Troubleshooting

### Common Issues
1. Rate limit exceeded
   - Wait for the rate limit window to reset
   - Check rate limit headers for reset time

2. Permission denied
   - Verify user role assignments
   - Check channel-specific permissions
   - Clear permission cache if needed

3. Invalid token
   - Check token format
   - Verify token expiration
   - Ensure proper token transmission

### Security Logs
- Security events are logged to `/logs/security.log`
- Rate limit violations are tracked
- Permission denials are recorded
- Authentication failures are monitored

## Security Checklist
- [ ] Regular dependency updates
- [ ] Security log monitoring
- [ ] Rate limit configuration review
- [ ] Permission audit
- [ ] Token rotation
- [ ] Input validation testing 