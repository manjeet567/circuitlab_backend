import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service.js';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export class ProjectController {
  public async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await projectService.getProjects();
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const project = await projectService.getProjectById(id);
      res.json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  }

  public async create(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.createProject(req.body);
      res.status(201).json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const project = await projectService.updateProject(id, req.body);
      res.json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      await projectService.deleteProject(id);
      res.json({ success: true, data: { message: `Project ${id} deleted successfully.` } });
    } catch (err) {
      next(err);
    }
  }

  public async share(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const shareData = await projectService.createShareLink(id);
      res.json({ success: true, data: shareData });
    } catch (err) {
      next(err);
    }
  }

  public async revokeShare(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      await projectService.revokeShareLink(id);
      res.json({ success: true, data: { message: 'Share link revoked.' } });
    } catch (err) {
      next(err);
    }
  }

  public async getShared(req: Request, res: Response, next: NextFunction) {
    try {
      const shareId = getParam(req.params.shareId);
      const project = await projectService.getSharedProject(shareId);
      res.json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  }

  public async exportProject(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const project = await projectService.getProjectById(id);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/\s+/g, '_')}.json"`);
      res.send(JSON.stringify(project, null, 2));
    } catch (err) {
      next(err);
    }
  }

  public async importProject(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.importProject(req.body);
      res.status(201).json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  }
}

export const projectController = new ProjectController();
