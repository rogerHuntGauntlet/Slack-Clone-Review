// Custom logger that works in both development and production
const logger = {
  log: (...args: any[]) => {
    // Always log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
    // In production, use a special flag to enable logging
    if (process.env.NEXT_PUBLIC_ENABLE_LOGS === 'true') {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors in both development and production
    console.error(...args);
  }
};

export default logger; 