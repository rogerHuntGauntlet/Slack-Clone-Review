import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { logError } from './logger';

// Base schemas for common fields
const dateRangeSchema = z.object({
  start: z.string().datetime().nullable(),
  end: z.string().datetime().nullable(),
}).optional();

const channelsSchema = z.array(z.string().min(1)).optional();

// Schema for search requests
export const searchRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  filters: z.object({
    channels: channelsSchema,
    dateRange: dateRangeSchema,
  }).optional(),
});

// Schema for message processing
export const messageSchema = z.object({
  content: z.string().min(1).max(10000),
  channelId: z.string().min(1),
  userId: z.string().min(1),
  timestamp: z.string().datetime(),
});

export const processRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(1000),
});

// Type definitions
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type ProcessRequest = z.infer<typeof processRequestSchema>;

// Sanitization functions
export function sanitizeContent(content: string): string {
  try {
    // Remove any HTML/script content
    const clean = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
    });

    // Additional sanitization
    return clean
      .trim()
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  } catch (error) {
    logError('Content sanitization failed', { error });
    return ''; // Return empty string if sanitization fails
  }
}

// Validation functions with sanitization
export async function validateSearchRequest(data: unknown): Promise<SearchRequest> {
  const result = await searchRequestSchema.parseAsync(data);
  return {
    ...result,
    query: sanitizeContent(result.query),
  };
}

export async function validateProcessRequest(data: unknown): Promise<ProcessRequest> {
  const result = await processRequestSchema.parseAsync(data);
  return {
    messages: result.messages.map(msg => ({
      ...msg,
      content: sanitizeContent(msg.content),
    })),
  };
}

// Access control validation
export function validateUserAccess(
  userId: string,
  channelId: string,
  requiredPermissions: string[] = []
): Promise<boolean> {
  // TODO: Implement actual permission checking logic
  return Promise.resolve(true);
}

// Security validation helpers
export function validateTokenFormat(token: string): boolean {
  if (!token) return false;
  
  // Basic JWT format validation
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  const parts = token.split('.');
  
  // Check number of parts
  if (parts.length !== 3) {
    return false;
  }

  // Check each part is valid base64url
  const base64UrlRegex = /^[A-Za-z0-9-_]*$/;
  if (!parts.every(part => base64UrlRegex.test(part))) {
    return false;
  }

  // Check overall format
  return jwtRegex.test(token);
}

export function validateChannelAccess(
  userId: string,
  channelIds: string[]
): Promise<string[]> {
  // TODO: Implement channel access validation
  return Promise.resolve(channelIds);
}

// Error handling
export class ValidationError extends Error {
  constructor(
    message: string,
    public details: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Middleware helper
export async function validateRequest<T>(
  schema: z.Schema<T>,
  data: unknown
): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Validation failed', {
        errors: error.errors,
      });
    }
    throw error;
  }
} 