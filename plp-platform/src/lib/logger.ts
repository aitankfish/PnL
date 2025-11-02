/**
 * Logger Utility
 * Centralized logging for the PLP platform
 * Never use console.log in production - always use this logger
 */

// Logger metadata type
type LogMetadata = Record<string, unknown> | undefined;

// Winston logger type
interface WinstonLogger {
  debug: (message: string, meta?: LogMetadata) => void;
  info: (message: string, meta?: LogMetadata) => void;
  warn: (message: string, meta?: LogMetadata) => void;
  error: (message: string, meta?: LogMetadata) => void;
  add: (transport: unknown) => void;
}

// Check if we're on the server side
const isServer = typeof window === 'undefined';

// Server-side logger (Winston)
let serverLogger: WinstonLogger | null = null;

if (isServer) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const winston = require('winston');
    
    serverLogger = winston.createLogger({
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'plp-platform' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });

    // Add file transport for production
    if (process.env.NODE_ENV === 'production') {
      serverLogger.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        })
      );
      serverLogger.add(
        new winston.transports.File({
          filename: 'logs/combined.log',
        })
      );
    }
  } catch (error) {
    // Fallback if winston fails to load
    console.error('Failed to initialize Winston logger:', error);
  }
}

// Client-side logger for browser use
const createClientLoggerFunction = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    debug: (message: string, meta?: LogMetadata) => {
      if (isDevelopment) {
        console.log(`[DEBUG] ${message}`, meta);
      }
    },
    info: (message: string, meta?: LogMetadata) => {
      if (isDevelopment) {
        console.info(`[INFO] ${message}`, meta);
      }
    },
    warn: (message: string, meta?: LogMetadata) => {
      console.warn(`[WARN] ${message}`, meta);
    },
    error: (message: string, meta?: LogMetadata) => {
      console.error(`[ERROR] ${message}`, meta);
    },
  };
};

// Universal logger that works on both client and server
const logger = {
  debug: (message: string, meta?: LogMetadata) => {
    if (isServer && serverLogger) {
      serverLogger.debug(message, meta);
    } else {
      createClientLoggerFunction().debug(message, meta);
    }
  },
  info: (message: string, meta?: LogMetadata) => {
    if (isServer && serverLogger) {
      serverLogger.info(message, meta);
    } else {
      createClientLoggerFunction().info(message, meta);
    }
  },
  warn: (message: string, meta?: LogMetadata) => {
    if (isServer && serverLogger) {
      serverLogger.warn(message, meta);
    } else {
      createClientLoggerFunction().warn(message, meta);
    }
  },
  error: (message: string, meta?: LogMetadata) => {
    if (isServer && serverLogger) {
      serverLogger.error(message, meta);
    } else {
      createClientLoggerFunction().error(message, meta);
    }
  },
};

// Export the universal logger
export default logger;

// Export client logger for explicit client-side use
export const createClientLogger = createClientLoggerFunction;

// Convenience functions
export const logInfo = (message: string, meta?: LogMetadata) => logger.info(message, meta);
export const logError = (message: string, meta?: LogMetadata) => logger.error(message, meta);
export const logWarn = (message: string, meta?: LogMetadata) => logger.warn(message, meta);
export const logDebug = (message: string, meta?: LogMetadata) => logger.debug(message, meta);
