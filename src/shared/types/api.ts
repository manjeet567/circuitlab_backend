import { CircuitProject, ProjectSummary } from './project.js';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  components?: CircuitProject['components'];
  wires?: CircuitProject['wires'];
  camera?: CircuitProject['camera'];
  editorSettings?: Partial<CircuitProject['editorSettings']>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  components?: CircuitProject['components'];
  wires?: CircuitProject['wires'];
  camera?: CircuitProject['camera'];
  editorSettings?: Partial<CircuitProject['editorSettings']>;
}

export interface ShareProjectResponse {
  shareId: string;
  shareUrl: string;
  isPublic: boolean;
}

export interface ProjectListResponse {
  projects: ProjectSummary[];
  total: number;
}
