import express from 'express';
import cors from 'cors';
import { Server } from 'http';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { requestLogger } from './middleware/logger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { apiRouter } from './routes/index.js';
import { NotFoundError } from './utils/errors.js';
import { logger } from './utils/logger.js';

export const app = express();

// Middlewares
app.use(cors({
  origin: [env.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// API Routes
app.use('/api', apiRouter);

// Catch-all for undefined routes
app.use((req, _res, next) => {
  next(new NotFoundError(`Endpoint ${req.method} ${req.originalUrl} does not exist.`));
});

// Centralized Error Handler
app.use(errorHandler);

let server: Server | null = null;
let isShuttingDown = false;

// Graceful shutdown handler
export async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDatabase();
      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    });

    // Force exit after 10 seconds if hanging
    setTimeout(() => {
      logger.error('Forcefully terminating process after shutdown timeout.');
      process.exit(1);
    }, 10000).unref();
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Only listen if not imported in a test runner
if (process.env.NODE_ENV !== 'test') {
  connectDatabase().then(() => {
    server = app.listen(env.PORT, () => {
      logger.info(`🚀 CircuitLab 3D API server running on http://localhost:${env.PORT}`);
    });
  });
}

export default app;
