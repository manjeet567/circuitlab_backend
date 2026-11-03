import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

describe('Project CRUD & Validation API', () => {
  let createdProjectId: string;

  it('POST /api/projects creates a new project with valid data', async () => {
    const payload = {
      name: 'Smart Home ESP32 Circuit',
      description: 'Automated lighting and sensor test circuit',
      components: [
        {
          id: 'esp32_1',
          type: 'esp32',
          name: 'ESP32 NodeMCU',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          properties: {},
        },
      ],
      wires: [],
    };

    const res = await request(app).post('/api/projects').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('Smart Home ESP32 Circuit');
    expect(res.body.data.schemaVersion).toBe(2);

    createdProjectId = res.body.data.id;
  });

  it('POST /api/projects returns 422 if project name is missing', async () => {
    const res = await request(app).post('/api/projects').send({ description: 'No name' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/projects lists projects', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.projects)).toBe(true);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/projects/:id retrieves the created project', async () => {
    const res = await request(app).get(`/api/projects/${createdProjectId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdProjectId);
  });

  it('GET /api/projects/:id returns 404 for non-existent ID', async () => {
    const res = await request(app).get('/api/projects/proj_nonexistent_999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT /api/projects/:id updates project and increments version', async () => {
    const res = await request(app)
      .put(`/api/projects/${createdProjectId}`)
      .send({ name: 'Smart Home ESP32 Circuit - Updated' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Smart Home ESP32 Circuit - Updated');
    expect(res.body.data.version).toBe(2);
  });

  it('GET /api/projects/:id/export exports valid JSON file', async () => {
    const res = await request(app).get(`/api/projects/${createdProjectId}/export`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const parsed = JSON.parse(res.text);
    expect(parsed.id).toBe(createdProjectId);
  });

  it('POST /api/projects/import imports and migrates project JSON', async () => {
    const importPayload = {
      name: 'Imported Circuit',
      description: 'Circuit imported from file',
      components: [],
      wires: [],
    };

    const res = await request(app).post('/api/projects/import').send(importPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Imported Circuit (Imported)');
    expect(res.body.data.id).not.toBe(createdProjectId);
  });

  it('DELETE /api/projects/:id deletes the project', async () => {
    const res = await request(app).delete(`/api/projects/${createdProjectId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app).get(`/api/projects/${createdProjectId}`);
    expect(getRes.status).toBe(404);
  });
});
