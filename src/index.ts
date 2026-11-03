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

// Parse and normalize allowed CORS origins
const getAllowedOrigins = (): string[] => {
  const rawList = [env.CLIENT_URL, env.CORS_ORIGIN]
    .filter(Boolean)
    .join(',');
  const parsed = rawList
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, '')) // strip any trailing slashes
    .filter(Boolean);

  // Default allowed local development origins
  parsed.push(
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  );
  return Array.from(new Set(parsed));
};

const allowedOrigins = getAllowedOrigins();
const allowAnyOrigin =
  allowedOrigins.includes('*') ||
  env.NODE_ENV === 'development' ||
  process.env.CORS_ALLOW_ALL === 'true';

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, postman, server-to-server) or wildcard mode
    if (!origin || allowAnyOrigin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.replace(/\/+$/, '');

    // Check exact match, localhost/127.0.0.1, or common cloud frontend deployment domains
    const isAllowed =
      allowedOrigins.includes(cleanOrigin) ||
      cleanOrigin.includes('localhost') ||
      cleanOrigin.includes('127.0.0.1') ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.endsWith('.onrender.com') ||
      cleanOrigin.endsWith('.netlify.app');

    if (isAllowed) {
      return callback(null, true);
    }

    logger.warn(`Blocked request from unauthorized CORS origin: ${origin}`);
    return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
};

// Middlewares
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests for all routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Root route for hosting health checks and browser verification
app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'CircuitLab 3D API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      projects: '/api/projects',
      simulation: '/api/simulation',
    },
    timestamp: new Date().toISOString(),
  });
});

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
