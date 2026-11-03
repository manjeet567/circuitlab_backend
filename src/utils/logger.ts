export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private format(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  public debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.format('debug', message, meta));
    }
  }

  public info(message: string, meta?: any) {
    console.info(this.format('info', message, meta));
  }

  public warn(message: string, meta?: any) {
    console.warn(this.format('warn', message, meta));
  }

  public error(message: string, meta?: any) {
    console.error(this.format('error', message, meta));
  }
}

export const logger = new Logger();
