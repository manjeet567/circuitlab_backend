import { randomUUID } from 'crypto';
import {
  CircuitProject,
  ProjectSummary,
  CreateProjectRequest,
  UpdateProjectRequest,
  migrateProject,
  CURRENT_SCHEMA_VERSION,
} from '../shared/index.js';
import { ProjectModel } from '../models/project.model.js';
import { isDbConnected } from '../config/database.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// In-memory fallback repository when MongoDB is not connected
class MemoryProjectStore {
  private store: Map<string, CircuitProject> = new Map();

  public get(id: string): CircuitProject | undefined {
    return this.store.get(id);
  }

  public getByShareId(shareId: string): CircuitProject | undefined {
    for (const proj of this.store.values()) {
      if (proj.shareId === shareId) return proj;
    }
    return undefined;
  }

  public getAll(): CircuitProject[] {
    return Array.from(this.store.values());
  }

  public set(id: string, project: CircuitProject): void {
    this.store.set(id, project);
  }

  public delete(id: string): boolean {
    return this.store.delete(id);
  }
}

const memoryStore = new MemoryProjectStore();

export class ProjectService {
  /**
   * List all projects
   */
  public async getProjects(): Promise<{ projects: ProjectSummary[]; total: number }> {
    if (isDbConnected()) {
      const docs = await ProjectModel.find().sort({ updatedAt: -1 }).lean();
      const summaries: ProjectSummary[] = docs.map((d: any) => ({
        id: d._id,
        name: d.name,
        description: d.description || '',
        componentCount: d.components?.length || 0,
        wireCount: d.wires?.length || 0,
        updatedAt: d.updatedAt?.toISOString ? d.updatedAt.toISOString() : new Date().toISOString(),
        shareId: d.shareId,
      }));
      return { projects: summaries, total: summaries.length };
    }

    const all = memoryStore.getAll();
    const summaries: ProjectSummary[] = all.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      componentCount: p.components.length,
      wireCount: p.wires.length,
      updatedAt: p.updatedAt,
      shareId: p.shareId,
    }));
    return { projects: summaries, total: summaries.length };
  }

  /**
   * Get single project by ID
   */
  public async getProjectById(id: string): Promise<CircuitProject> {
    if (isDbConnected()) {
      const doc = await ProjectModel.findById(id);
      if (!doc) {
        throw new NotFoundError(`Project with ID ${id} not found.`);
      }
      return doc.toJSON() as unknown as CircuitProject;
    }

    const project = memoryStore.get(id);
    if (!project) {
      throw new NotFoundError(`Project with ID ${id} not found.`);
    }
    return project;
  }

  /**
   * Create a new project
   */
  public async createProject(data: CreateProjectRequest): Promise<CircuitProject> {
    const id = `proj_${randomUUID().substring(0, 12)}`;
    const now = new Date().toISOString();

    const rawProject = {
      id,
      name: data.name.trim(),
      description: data.description || '',
      version: 1,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      components: data.components || [],
      wires: data.wires || [],
      camera: data.camera || { position: [0, 8, 12], target: [0, 0, 0] },
      editorSettings: {
        gridSnap: data.editorSettings?.gridSnap ?? true,
        gridSize: data.editorSettings?.gridSize ?? 0.5,
        defaultWireColor: data.editorSettings?.defaultWireColor ?? '#3b82f6',
        theme: data.editorSettings?.theme ?? 'dark',
        showLabels: data.editorSettings?.showLabels ?? true,
        autoValidate: data.editorSettings?.autoValidate ?? true,
      },
      createdAt: now,
      updatedAt: now,
    };

    const validated = migrateProject(rawProject);

    if (isDbConnected()) {
      const doc = new ProjectModel({
        _id: validated.id,
        ...validated,
      });
      await doc.save();
      logger.info(`Saved project ${validated.id} to MongoDB`);
      return doc.toJSON() as unknown as CircuitProject;
    }

    memoryStore.set(validated.id, validated);
    logger.info(`Saved project ${validated.id} to memory store`);
    return validated;
  }

  /**
   * Update an existing project
   */
  public async updateProject(id: string, data: UpdateProjectRequest): Promise<CircuitProject> {
    const existing = await this.getProjectById(id);
    const now = new Date().toISOString();

    const updatedData: CircuitProject = {
      ...existing,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      version: existing.version + 1,
      components: data.components !== undefined ? data.components : existing.components,
      wires: data.wires !== undefined ? data.wires : existing.wires,
      camera: data.camera !== undefined ? data.camera : existing.camera,
      editorSettings: {
        ...existing.editorSettings,
        ...(data.editorSettings || {}),
      },
      updatedAt: now,
    };

    const validated = migrateProject(updatedData);

    if (isDbConnected()) {
      const doc = await ProjectModel.findByIdAndUpdate(
        id,
        {
          name: validated.name,
          description: validated.description,
          version: validated.version,
          components: validated.components,
          wires: validated.wires,
          camera: validated.camera,
          editorSettings: validated.editorSettings,
          updatedAt: now,
        },
        { new: true }
      );
      if (!doc) throw new NotFoundError(`Project ${id} not found.`);
      return doc.toJSON() as unknown as CircuitProject;
    }

    memoryStore.set(id, validated);
    return validated;
  }

  /**
   * Delete a project
   */
  public async deleteProject(id: string): Promise<boolean> {
    if (isDbConnected()) {
      const result = await ProjectModel.findByIdAndDelete(id);
      if (!result) throw new NotFoundError(`Project ${id} not found.`);
      return true;
    }

    const existed = memoryStore.delete(id);
    if (!existed) throw new NotFoundError(`Project ${id} not found.`);
    return true;
  }

  /**
   * Generate a public read-only share link
   */
  public async createShareLink(id: string): Promise<{ shareId: string; shareUrl: string; isPublic: boolean }> {
    const project = await this.getProjectById(id);
    const shareId = project.shareId || `share_${randomUUID().replace(/-/g, '').substring(0, 16)}`;

    if (isDbConnected()) {
      await ProjectModel.findByIdAndUpdate(id, {
        shareId,
        isPublic: true,
      });
    } else {
      project.shareId = shareId;
      project.isPublic = true;
      memoryStore.set(id, project);
    }

    return {
      shareId,
      shareUrl: `/share/${shareId}`,
      isPublic: true,
    };
  }

  /**
   * Revoke a project share link
   */
  public async revokeShareLink(id: string): Promise<boolean> {
    const project = await this.getProjectById(id);

    if (isDbConnected()) {
      await ProjectModel.findByIdAndUpdate(id, {
        $unset: { shareId: 1 },
        isPublic: false,
      });
    } else {
      delete project.shareId;
      project.isPublic = false;
      memoryStore.set(id, project);
    }

    return true;
  }

  /**
   * Retrieve a shared project by shareId (Read-Only)
   */
  public async getSharedProject(shareId: string): Promise<CircuitProject & { readOnly: boolean }> {
    let project: CircuitProject | undefined;

    if (isDbConnected()) {
      const doc = await ProjectModel.findOne({ shareId, isPublic: true });
      if (doc) {
        project = doc.toJSON() as unknown as CircuitProject;
      }
    } else {
      const p = memoryStore.getByShareId(shareId);
      if (p && p.isPublic) {
        project = p;
      }
    }

    if (!project) {
      throw new NotFoundError(`Shared project with share code '${shareId}' not found or link has expired.`);
    }

    return {
      ...project,
      readOnly: true,
    };
  }

  /**
   * Import project from raw JSON
   */
  public async importProject(rawJson: string | object): Promise<CircuitProject> {
    let parsed: any;
    if (typeof rawJson === 'string') {
      try {
        parsed = JSON.parse(rawJson);
      } catch (err: any) {
        throw new BadRequestError(`Invalid JSON format: ${err.message}`);
      }
    } else {
      parsed = { ...rawJson };
    }

    if (!parsed.id) {
      parsed.id = `proj_${randomUUID().substring(0, 12)}`;
    }

    // Safely migrate up to current schema version
    const migrated = migrateProject(parsed);

    // Give it a fresh project ID for the imported instance
    const importedProject: CircuitProject = {
      ...migrated,
      id: `proj_${randomUUID().substring(0, 12)}`,
      name: `${migrated.name} (Imported)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shareId: undefined,
      isPublic: false,
    };

    if (isDbConnected()) {
      const doc = new ProjectModel({
        _id: importedProject.id,
        ...importedProject,
      });
      await doc.save();
      return doc.toJSON() as unknown as CircuitProject;
    }

    memoryStore.set(importedProject.id, importedProject);
    return importedProject;
  }
}

export const projectService = new ProjectService();
