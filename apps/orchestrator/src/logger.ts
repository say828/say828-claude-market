type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  context?: string;
  data?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

class Logger {
  private level: LogLevel;
  private context: string;

  constructor(context = 'Orchestrator', level: LogLevel = 'info') {
    this.context = context;
    this.level = (process.env.LOG_LEVEL as LogLevel) || level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').slice(0, 23);
  }

  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const timestamp = this.formatTimestamp();
    const ctx = options?.context || this.context;
    const color = LOG_COLORS[level];
    const levelStr = level.toUpperCase().padEnd(5);

    let output = `${DIM}${timestamp}${RESET} ${color}${levelStr}${RESET} [${ctx}] ${message}`;

    if (options?.data) {
      output += ` ${DIM}${JSON.stringify(options.data)}${RESET}`;
    }

    return output;
  }

  debug(message: string, options?: LogOptions): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, options));
    }
  }

  info(message: string, options?: LogOptions): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, options));
    }
  }

  warn(message: string, options?: LogOptions): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, options));
    }
  }

  error(message: string, error?: Error | unknown, options?: LogOptions): void {
    if (this.shouldLog('error')) {
      const errorData = error instanceof Error
        ? { error: error.message, stack: error.stack }
        : { error: String(error) };

      console.error(this.formatMessage('error', message, {
        ...options,
        data: { ...options?.data, ...errorData },
      }));
    }
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.level);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

// Singleton instance
export const logger = new Logger();

// Named exports for convenience
export const debug = (message: string, options?: LogOptions) => logger.debug(message, options);
export const info = (message: string, options?: LogOptions) => logger.info(message, options);
export const warn = (message: string, options?: LogOptions) => logger.warn(message, options);
export const error = (message: string, err?: Error | unknown, options?: LogOptions) => logger.error(message, err, options);

export default logger;
