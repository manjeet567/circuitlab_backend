import { describe, it, expect } from 'vitest';
import { migrateProject } from '../migrations/index.js';

describe('Project Schema Migrations', () => {
  it('upgrades a legacy v1 project to v2 format correctly', () => {
    const legacyV1 = {
      id: 'proj_legacy_1',
      name: 'Old Project V1',
      description: 'Built with version 1',
      schemaVersion: 1,
      components: [
        {
          id: 'c1',
          type: 'resistor',
          name: 'Resistor 1k',
          position: { x: 1, y: 0, z: -2 }, // object format
          rotation: { x: 0, y: 1.57, z: 0 },
          properties: { resistance: 1000 },
        },
      ],
      wires: [
        {
          id: 'w1',
          color: '#ff0000',
          from: 'c1.pin1', // dot syntax
          to: 'c1.pin2',
        },
      ],
      camera: {
        position: [0, 5, 10],
        target: [0, 0, 0],
      },
    };

    const migrated = migrateProject(legacyV1);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.name).toBe('Old Project V1');
    expect(migrated.components[0].position).toEqual([1, 0, -2]);
    expect(migrated.components[0].rotation).toEqual([0, 1.57, 0]);
    expect(migrated.wires[0].from).toEqual({ componentId: 'c1', pinId: 'pin1' });
    expect(migrated.wires[0].to).toEqual({ componentId: 'c1', pinId: 'pin2' });
    expect(migrated.editorSettings.autoValidate).toBe(true);
  });

  it('rejects future unsupported schema versions', () => {
    const futureProject = {
      id: 'proj_future',
      name: 'Future Project',
      schemaVersion: 999,
      components: [],
      wires: [],
    };

    expect(() => migrateProject(futureProject)).toThrow(/Unsupported schema version/);
  });
});
