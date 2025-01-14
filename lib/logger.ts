export interface LogContext {
  [key: string]: unknown;
}

const formatMessage = (message: string, context?: LogContext) => {
  return context ? `${message} ${JSON.stringify(context)}` : message;
};

export function logInfo(message: string, context?: LogContext) {
  console.info(formatMessage(message, context));
}

export function logError(message: string | Error, context?: LogContext) {
  const errorMessage = message instanceof Error ? message.message : message;
  console.error(formatMessage(errorMessage, context));
}

export function logWarning(message: string, context?: LogContext) {
  console.warn(formatMessage(message, context));
}

export function logDebug(message: string, context?: LogContext) {
  console.debug(formatMessage(message, context));
}

export function logPerformance(action: string, durationMs: number, context?: LogContext) {
  console.info(formatMessage(`Performance: ${action}`, { ...context, durationMs }));
}

export function logRequest(method: string, path: string, statusCode: number, durationMs: number, context?: LogContext) {
  console.info(formatMessage(`Request: ${method} ${path}`, { ...context, method, path, statusCode, durationMs }));
} 