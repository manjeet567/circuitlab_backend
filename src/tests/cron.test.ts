import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getHealthCheckUrl,
  pingHealthEndpoint,
  startKeepAliveCron,
  stopKeepAliveCron,
} from '../services/cron.service.js';

describe('KeepAlive Cron Service', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    stopKeepAliveCron();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    stopKeepAliveCron();
    vi.restoreAllMocks();
  });

  it('resolves health URL from NEXT_PUBLIC_API_URL without trailing slash', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://circuitlab-backend.onrender.com';
    const url = getHealthCheckUrl();
    expect(url).toBe('https://circuitlab-backend.onrender.com/api/health');
  });

  it('normalizes NEXT_PUBLIC_API_URL with trailing slash', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://circuitlab-backend.onrender.com/';
    const url = getHealthCheckUrl();
    expect(url).toBe('https://circuitlab-backend.onrender.com/api/health');
  });

  it('handles NEXT_PUBLIC_API_URL containing /api', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://circuitlab-backend.onrender.com/api';
    const url = getHealthCheckUrl();
    expect(url).toBe('https://circuitlab-backend.onrender.com/api/health');
  });

  it('handles NEXT_PUBLIC_API_URL ending directly with /api/health', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://circuitlab-backend.onrender.com/api/health';
    const url = getHealthCheckUrl();
    expect(url).toBe('https://circuitlab-backend.onrender.com/api/health');
  });

  it('falls back to localhost when no API URL environment variables are present', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.API_URL;
    delete process.env.BACKEND_URL;
    delete process.env.RENDER_EXTERNAL_URL;

    const url = getHealthCheckUrl();
    expect(url).toContain('/api/health');
    expect(url).toContain('http://localhost');
  });

  it('successfully pings the health endpoint when fetch returns 200 OK', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://circuitlab-backend.onrender.com';

    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await pingHealthEndpoint();
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://circuitlab-backend.onrender.com/api/health',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
        }),
      })
    );
  });

  it('handles fetch failure gracefully without throwing or crashing', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://circuitlab-backend.onrender.com';

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await pingHealthEndpoint();
    expect(result).toBe(false);
  });

  it('starts and stops the keep-alive cron job without hanging timers', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    startKeepAliveCron(60000);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);

    stopKeepAliveCron();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
