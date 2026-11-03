import { Request, Response } from 'express';
import { isDbConnected } from '../config/database.js';

export function getHealth(_req: Request, res: Response) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: isDbConnected() ? 'connected' : 'memory_fallback',
    version: '1.0.0',
  });
}
