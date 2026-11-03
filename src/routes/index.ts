import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { projectRouter } from './project.routes.js';

export const apiRouter = Router();

apiRouter.use('/', healthRouter);
apiRouter.use('/', projectRouter);
