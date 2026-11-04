import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let cronTimer: NodeJS.Timeout | null = null;
let initialTimeout: NodeJS.Timeout | null = null;

/**
 * Resolves the health check URL from environment variables.
 * Priority: NEXT_PUBLIC_API_URL -> API_URL -> BACKEND_URL -> RENDER_EXTERNAL_URL -> localhost
 */
export function getHealthCheckUrl(): string {
  const rawUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    env.API_URL ||
    process.env.BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${env.PORT}`;

  let cleanUrl = rawUrl.trim().replace(/\/+$/, '');

  // If URL already ends with /health, return as is
  if (cleanUrl.endsWith('/health')) {
    return cleanUrl;
  }

  // If URL ends with /api, append /health
  if (cleanUrl.endsWith('/api')) {
    return `${cleanUrl}/health`;
  }

  // Otherwise append /api/health
  return `${cleanUrl}/api/health`;
}

/**
 * Pings the server's own health endpoint to prevent free-tier hosting
 * (like Render.com, Railway, Fly.io) from sleeping due to inactivity.
 */
export async function pingHealthEndpoint(): Promise<boolean> {
  const targetUrl = getHealthCheckUrl();
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'CircuitLab-Backend-KeepAlive-Cron/1.0',
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      logger.info(`[Cron KeepAlive] Ping to ${targetUrl} succeeded (HTTP ${response.status})`);
      return true;
    } else {
      logger.warn(`[Cron KeepAlive] Ping to ${targetUrl} returned HTTP ${response.status}`);
      return false;
    }
  } catch (err: any) {
    logger.warn(`[Cron KeepAlive] Ping to ${targetUrl} failed: ${err.message}`);
    return false;
  }
}

/**
 * Starts the keep-alive cron job running every 5 minutes (300,000 ms).
 * Sends an initial ping after 15 seconds so developers can verify it in logs immediately.
 */
export function startKeepAliveCron(intervalMs: number = 5 * 60 * 1000): void {
  if (cronTimer) {
    logger.info('[Cron KeepAlive] Job is already active.');
    return;
  }

  const targetUrl = getHealthCheckUrl();
  logger.info(`[Cron KeepAlive] Initializing 5-minute keep-alive cronjob -> Target: ${targetUrl}`);

  // Initial ping after 15 seconds so logs confirm status right away
  initialTimeout = setTimeout(() => {
    pingHealthEndpoint();
  }, 15000);
  initialTimeout.unref();

  // Recurring ping every 5 minutes (default 300,000 ms)
  cronTimer = setInterval(() => {
    pingHealthEndpoint();
  }, intervalMs);

  // Allow Node.js process to terminate gracefully without hanging on the interval
  cronTimer.unref();
}

/**
 * Stops the keep-alive cron job.
 */
export function stopKeepAliveCron(): void {
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
    logger.info('[Cron KeepAlive] Keep-alive cronjob stopped.');
  }
}
