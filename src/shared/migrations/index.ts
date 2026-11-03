import { CircuitProject } from '../types/project.js';
import { CURRENT_SCHEMA_VERSION, CircuitProjectSchema } from '../schemas/project.schema.js';

export interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate: (data: any) => any;
}

export const migrations: Migration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    migrate: (data: any) => {
      const migrated = { ...data };

      // Migrate components: convert {x, y, z} to [x, y, z] if present
      if (Array.isArray(migrated.components)) {
        migrated.components = migrated.components.map((comp: any) => {
          let pos = comp.position;
          if (pos && typeof pos === 'object' && !Array.isArray(pos)) {
            pos = [pos.x ?? 0, pos.y ?? 0, pos.z ?? 0];
          }
          let rot = comp.rotation;
          if (rot && typeof rot === 'object' && !Array.isArray(rot)) {
            rot = [rot.x ?? 0, rot.y ?? 0, rot.z ?? 0];
          }
          return {
            ...comp,
            position: pos || [0, 0, 0],
            rotation: rot || [0, 0, 0],
            properties: comp.properties || {},
          };
        });
      }

      // Migrate wires: convert legacy dot syntax "comp.pin" to { componentId, pinId }
      if (Array.isArray(migrated.wires)) {
        migrated.wires = migrated.wires.map((wire: any) => {
          let from = wire.from;
          if (typeof wire.from === 'string' && wire.from.includes('.')) {
            const [c, p] = wire.from.split('.');
            from = { componentId: c, pinId: p };
          }
          let to = wire.to;
          if (typeof wire.to === 'string' && wire.to.includes('.')) {
            const [c, p] = wire.to.split('.');
            to = { componentId: c, pinId: p };
          }
          return {
            ...wire,
            from: from || wire.from,
            to: to || wire.to,
          };
        });
      }

      // Migrate editorSettings
      migrated.editorSettings = {
        gridSnap: migrated.editorSettings?.gridSnap ?? true,
        gridSize: migrated.editorSettings?.gridSize ?? 0.5,
        defaultWireColor: migrated.editorSettings?.defaultWireColor ?? '#3b82f6',
        theme: migrated.editorSettings?.theme ?? 'dark',
        showLabels: migrated.editorSettings?.showLabels ?? true,
        autoValidate: migrated.editorSettings?.autoValidate ?? true,
      };

      migrated.schemaVersion = 2;
      return migrated;
    },
  },
];

/**
 * Safely migrates raw project data up to the current schema version
 * without discarding unrecognized or custom fields.
 */
export function migrateProject(rawData: any): CircuitProject {
  let current = { ...rawData };
  let version = current.schemaVersion || 1;

  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schema version ${version}. This version of CircuitLab 3D supports up to version ${CURRENT_SCHEMA_VERSION}.`
    );
  }

  while (version < CURRENT_SCHEMA_VERSION) {
    const migration = migrations.find((m) => m.fromVersion === version);
    if (!migration) {
      throw new Error(`No migration path from schema version ${version} to ${version + 1}.`);
    }
    current = migration.migrate(current);
    version = current.schemaVersion;
  }

  // Validate with Zod
  const result = CircuitProjectSchema.safeParse(current);
  if (!result.success) {
    throw new Error(`Migration validation failed: ${result.error.message}`);
  }

  return result.data as CircuitProject;
}
