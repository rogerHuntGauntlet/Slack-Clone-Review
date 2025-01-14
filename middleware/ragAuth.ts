import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import { logError } from '@/lib/logger';

// Initialize Redis for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
});

// Create rate limiters
const searchRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
  prefix: 'rag_search',
});

const processRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, '1 m'), // 1000 messages per minute
  analytics: true,
  prefix: 'rag_process',
});

// Helper to validate JWT token
async function validateToken(token: string): Promise<boolean> {
  try {
    // Verify token with your auth provider (e.g., Supabase, Auth0)
    const response = await fetch(`${process.env.AUTH_URL}/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch (error) {
    logError('Token validation failed', { error });
    return false;
  }
}

// Helper to get client identifier
function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.ip;
  const userAgent = req.headers.get('user-agent') || '';
  
  // Create a hash of IP and user agent
  return createHash('sha256')
    .update(`${ip}-${userAgent}`)
    .digest('hex');
}

// Main middleware function
export async function ragAuthMiddleware(req: NextRequest) {
  try {
    // 1. Authentication
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      );
    }

    const isValidToken = await validateToken(token);
    if (!isValidToken) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401 }
      );
    }

    // 2. Rate Limiting
    const identifier = getClientIdentifier(req);
    const isSearchEndpoint = req.nextUrl.pathname === '/api/rag/query';
    const limiter = isSearchEndpoint ? searchRateLimit : processRateLimit;

    const { success, limit, reset, remaining } = await limiter.limit(identifier);
    
    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          limit,
          reset,
          remaining,
        }),
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }

    // 3. Input Validation
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return new NextResponse(
        JSON.stringify({ error: 'Content-Type must be application/json' }),
        { status: 400 }
      );
    }

    // 4. Add rate limit headers to successful requests
    const response = await fetch(req);
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    return response;
  } catch (error) {
    logError('RAG middleware error', { error });
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
} 