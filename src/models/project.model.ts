import mongoose, { Schema } from 'mongoose';
import { CircuitProject } from '../shared/index.js';

export interface IProjectDocument extends Omit<CircuitProject, 'id'> {
  _id: string;
}

const ComponentSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    name: { type: String, required: true },
    position: { type: [Number], required: true },
    rotation: { type: [Number], required: true },
    properties: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const WireSchema = new Schema(
  {
    id: { type: String, required: true },
    color: { type: String, required: true },
    from: {
      componentId: { type: String, required: true },
      pinId: { type: String, required: true },
    },
    to: {
      componentId: { type: String, required: true },
      pinId: { type: String, required: true },
    },
    style: { type: String, enum: ['straight', 'curved'], default: 'straight' },
  },
  { _id: false }
);

const CameraSchema = new Schema(
  {
    position: { type: [Number], default: [0, 8, 12] },
    target: { type: [Number], default: [0, 0, 0] },
    zoom: { type: Number, default: 1 },
  },
  { _id: false }
);

const EditorSettingsSchema = new Schema(
  {
    gridSnap: { type: Boolean, default: true },
    gridSize: { type: Number, default: 0.5 },
    defaultWireColor: { type: String, default: '#3b82f6' },
    theme: { type: String, default: 'dark' },
    showLabels: { type: Boolean, default: true },
    autoValidate: { type: Boolean, default: true },
  },
  { _id: false }
);

const ProjectSchema = new Schema<IProjectDocument>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    version: { type: Number, default: 1 },
    schemaVersion: { type: Number, default: 2 },
    components: { type: [ComponentSchema], default: [] },
    wires: { type: [WireSchema], default: [] },
    camera: { type: CameraSchema, default: () => ({ position: [0, 8, 12], target: [0, 0, 0] }) },
    editorSettings: {
      type: EditorSettingsSchema,
      default: () => ({
        gridSnap: true,
        gridSize: 0.5,
        defaultWireColor: '#3b82f6',
        theme: 'dark',
        showLabels: true,
        autoValidate: true,
      }),
    },
    shareId: { type: String, index: true, sparse: true },
    isPublic: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ProjectModel = mongoose.model<IProjectDocument>('Project', ProjectSchema);
