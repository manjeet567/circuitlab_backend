import { z } from 'zod';

export const ComponentTypeSchema = z.enum([
  'esp32',
  'led',
  'resistor',
  'push_button',
  'dht22',
  'breadboard',
]);

export const PlacedComponentSchema = z.object({
  id: z.string().min(1),
  type: ComponentTypeSchema,
  name: z.string().min(1),
  position: z.tuple([z.number(), z.number(), z.number()]),
  rotation: z.tuple([z.number(), z.number(), z.number()]),
  properties: z.record(z.any()).default({}),
});

export const WirePinReferenceSchema = z.object({
  componentId: z.string().min(1),
  pinId: z.string().min(1),
});

export const WireSchema = z.object({
  id: z.string().min(1),
  color: z.string().min(1),
  from: WirePinReferenceSchema,
  to: WirePinReferenceSchema,
  style: z.enum(['straight', 'curved']).optional(),
});

export const CameraStateSchema = z.object({
  position: z.tuple([z.number(), z.number(), z.number()]),
  target: z.tuple([z.number(), z.number(), z.number()]),
  zoom: z.number().optional(),
});

export const EditorSettingsSchema = z.object({
  gridSnap: z.boolean().default(true),
  gridSize: z.number().default(0.5),
  defaultWireColor: z.string().default('#3b82f6'),
  theme: z.enum(['dark', 'engineering']).default('dark'),
  showLabels: z.boolean().default(true),
  autoValidate: z.boolean().default(true),
});

export const CURRENT_SCHEMA_VERSION = 2;

export const CircuitProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(500).default(''),
  version: z.number().default(1),
  schemaVersion: z.number().default(CURRENT_SCHEMA_VERSION),
  components: z.array(PlacedComponentSchema).default([]),
  wires: z.array(WireSchema).default([]),
  camera: CameraStateSchema.default({
    position: [0, 8, 12],
    target: [0, 0, 0],
  }),
  editorSettings: EditorSettingsSchema.default({
    gridSnap: true,
    gridSize: 0.5,
    defaultWireColor: '#3b82f6',
    theme: 'dark',
    showLabels: true,
    autoValidate: true,
  }),
  shareId: z.string().optional(),
  isPublic: z.boolean().default(false),
  createdAt: z.string().datetime().or(z.string()).default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().or(z.string()).default(() => new Date().toISOString()),
});

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().default(''),
  components: z.array(PlacedComponentSchema).optional(),
  wires: z.array(WireSchema).optional(),
  camera: CameraStateSchema.optional(),
  editorSettings: EditorSettingsSchema.partial().optional(),
});

export const UpdateProjectInputSchema = CreateProjectInputSchema.partial();
