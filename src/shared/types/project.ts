import { PlacedComponent, Wire } from './component.js';

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom?: number;
}

export interface EditorSettings {
  gridSnap: boolean;
  gridSize: number;
  defaultWireColor: string;
  theme: 'dark' | 'engineering';
  showLabels: boolean;
  autoValidate: boolean;
}

export interface CircuitProject {
  id: string;
  name: string;
  description: string;
  version: number;
  schemaVersion: number;
  components: PlacedComponent[];
  wires: Wire[];
  camera: CameraState;
  editorSettings: EditorSettings;
  shareId?: string;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  componentCount: number;
  wireCount: number;
  updatedAt: string;
  shareId?: string;
}
