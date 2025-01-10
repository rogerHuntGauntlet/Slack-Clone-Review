// Custom logger that works in both development and production
const logger = {
  log: (...args: any[]) => {
    // Debug the environment
    console.log('[Logger Debug] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_ENABLE_LOGS: process.env.NEXT_PUBLIC_ENABLE_LOGS,
      isProduction: process.env.NODE_ENV === 'production',
      isDevelopment: process.env.NODE_ENV === 'development'
    });

    // Always log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
      return;
    }

    // In production, force logging for now
    console.log(...args);
  },
  error: (...args: any[]) => {
    // Always log errors in both development and production
    console.error(...args);
  }
};

// Log environment on module load
console.log('[Logger] Initializing with environment:', {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_ENABLE_LOGS: process.env.NEXT_PUBLIC_ENABLE_LOGS
});

export default logger; 