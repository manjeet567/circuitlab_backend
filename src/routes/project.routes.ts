import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { CreateProjectInputSchema, UpdateProjectInputSchema } from '../shared/index.js';

export const projectRouter = Router();

// Project CRUD
projectRouter.get('/projects', (req, res, next) => projectController.getAll(req, res, next));
projectRouter.get('/projects/:id', (req, res, next) => projectController.getOne(req, res, next));
projectRouter.post(
  '/projects',
  validateBody(CreateProjectInputSchema),
  (req, res, next) => projectController.create(req, res, next)
);
projectRouter.put(
  '/projects/:id',
  validateBody(UpdateProjectInputSchema),
  (req, res, next) => projectController.update(req, res, next)
);
projectRouter.delete('/projects/:id', (req, res, next) => projectController.delete(req, res, next));

// Share routes
projectRouter.post('/projects/:id/share', (req, res, next) => projectController.share(req, res, next));
projectRouter.delete('/projects/:id/share', (req, res, next) => projectController.revokeShare(req, res, next));
projectRouter.get('/projects/share/:shareId', (req, res, next) => projectController.getShared(req, res, next));

// Import / Export
projectRouter.get('/projects/:id/export', (req, res, next) => projectController.exportProject(req, res, next));
projectRouter.post('/projects/import', (req, res, next) => projectController.importProject(req, res, next));
