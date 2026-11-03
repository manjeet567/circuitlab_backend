import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

describe('Project Sharing & Read-Only Access', () => {
  let projectId: string;
  let shareId: string;

  it('generates a public share link for a project', async () => {
    // 1. Create project
    const createRes = await request(app).post('/api/projects').send({
      name: 'Shareable IoT Project',
      components: [],
    });
    projectId = createRes.body.data.id;

    // 2. Share project
    const shareRes = await request(app).post(`/api/projects/${projectId}/share`);
    expect(shareRes.status).toBe(200);
    expect(shareRes.body.success).toBe(true);
    expect(shareRes.body.data.shareId).toBeDefined();
    expect(shareRes.body.data.isPublic).toBe(true);

    shareId = shareRes.body.data.shareId;
  });

  it('retrieves shared project via shareId in read-only mode', async () => {
    const res = await request(app).get(`/api/projects/share/${shareId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(projectId);
    expect(res.body.data.readOnly).toBe(true);
  });

  it('revokes a share link and subsequent access returns 404', async () => {
    const revokeRes = await request(app).delete(`/api/projects/${projectId}/share`);
    expect(revokeRes.status).toBe(200);

    const getRes = await request(app).get(`/api/projects/share/${shareId}`);
    expect(getRes.status).toBe(404);
  });
});
