import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb } from '../../tests/helpers/test-db';

let fixture: Awaited<ReturnType<typeof createTestDb>>;
vi.mock('@/server/db', () => ({
  get db() {
    return fixture.db;
  },
}));

import { GET as authGet } from '@/app/api/auth/[operation]/route';
import { POST as postDate } from '@/app/api/demo/date/route';
import { POST as postPersona } from '@/app/api/demo/persona/route';
import { DEMO_DATE_COOKIE, demoModeEnabled } from './demo-mode';
import { personaPassword } from './demo-actions';

const origin = 'http://localhost:3000';
const secret = 'test-only-secret-never-used-in-a-real-deployment';

beforeEach(async () => {
  fixture = await createTestDb();
  vi.stubEnv('BETTER_AUTH_URL', origin);
  vi.stubEnv('BETTER_AUTH_SECRET', secret);
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('LEASE_LOOP_DEMO', '');
});
afterEach(async () => {
  await fixture.cleanup();
  vi.unstubAllEnvs();
});

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}${path}`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
const cookiesOf = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
async function me(cookie: string) {
  const response = await authGet(new Request(`${origin}/api/auth/me`, { headers: { cookie } }), {
    params: Promise.resolve({ operation: 'me' }),
  });
  return { status: response.status, body: await response.json() };
}
const switchTo = (personaId: string) =>
  postPersona(post('/api/demo/persona', { personaId }), undefined);

describe('demoModeEnabled', () => {
  it('is on outside production, off in production, and the env flag overrides both', () => {
    expect(demoModeEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(demoModeEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(demoModeEnabled({ NODE_ENV: 'production', LEASE_LOOP_DEMO: 'true' })).toBe(true);
    expect(demoModeEnabled({ NODE_ENV: 'development', LEASE_LOOP_DEMO: 'false' })).toBe(false);
  });
});

describe('POST /api/demo/date', () => {
  it('sets the demo-date cookie and records who changed it', async () => {
    const response = await postDate(post('/api/demo/date', { date: '2026-11-05' }), undefined);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ date: '2026-11-05' });
    const [cookie] = response.headers.getSetCookie();
    expect(cookie).toContain(`${DEMO_DATE_COOKIE}=2026-11-05`);
    expect(cookie).toContain('HttpOnly');
    const audit = await fixture.db.auditLog.findFirst({ where: { action: 'demo.date_set' } });
    expect(audit).toMatchObject({ actor: 'anonymous', entity_id: 'clock' });
    expect(JSON.parse(audit!.details_json!)).toEqual({ date: '2026-11-05' });
  });
  it('clears the demo date with null', async () => {
    const response = await postDate(post('/api/demo/date', { date: null }), undefined);
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()[0]).toContain('Max-Age=0');
    expect(await fixture.db.auditLog.count({ where: { action: 'demo.date_cleared' } })).toBe(1);
  });
  it('rejects dates outside the demo range without setting anything', async () => {
    for (const date of ['2025-12-31', '2026-02-30', 'tomorrow']) {
      const response = await postDate(post('/api/demo/date', { date }), undefined);
      expect(response.status).toBe(400);
      expect(response.headers.getSetCookie()).toEqual([]);
    }
    expect(await fixture.db.auditLog.count()).toBe(0);
  });
  it('rejects other origins and is hidden when demo mode is off', async () => {
    const forged = await postDate(
      post('/api/demo/date', { date: '2026-11-05' }, { origin: 'https://evil.example' }),
      undefined
    );
    expect(forged.status).toBe(403);
    vi.stubEnv('LEASE_LOOP_DEMO', 'false');
    const off = await postDate(post('/api/demo/date', { date: '2026-11-05' }), undefined);
    expect(off.status).toBe(404);
  });
});

describe('POST /api/demo/persona', () => {
  it('creates the persona on first use and signs this browser in as it', async () => {
    const response = await switchTo('cust-aino');
    expect(response.status).toBe(200);
    const session = await me(cookiesOf(response));
    expect(session.status).toBe(200);
    expect(session.body.data).toMatchObject({
      name: 'Aino Virtanen',
      email: 'aino.virtanen@example.com',
      role: 'customer',
      customerId: 'cust-aino',
    });
    const audit = await fixture.db.auditLog.findFirst({
      where: { action: 'demo.persona_switched' },
    });
    expect(audit).toMatchObject({ actor: session.body.data.id, entity_id: 'cust-aino' });
  });
  it('signs in again without creating a second account', async () => {
    await switchTo('cust-mikko');
    const again = await switchTo('cust-mikko');
    expect(again.status).toBe(200);
    expect((await me(cookiesOf(again))).body.data.customerId).toBe('cust-mikko');
    expect(await fixture.db.user.count({ where: { email: 'mikko.laine@example.com' } })).toBe(1);
  });
  it('offers a staff persona with the staff role', async () => {
    const response = await switchTo('demo-staff');
    expect((await me(cookiesOf(response))).body.data).toMatchObject({
      role: 'staff',
      customerId: 'demo-staff-customer',
    });
  });
  it('refuses unknown personas and accounts that someone registered with a persona e-mail', async () => {
    expect((await switchTo('cust-nobody')).status).toBe(404);
    const user = await fixture.db.user.create({
      data: { id: 'someone', name: 'Someone', email: 'lena.tamm@example.com' },
    });
    await fixture.db.customer.create({ data: { id: 'their-own', ownerUserId: user.id } });
    const response = await switchTo('cust-lena');
    expect(response.status).toBe(409);
    expect(response.headers.getSetCookie()).toEqual([]);
  });
  it('derives a strong, per-installation password that is never stored in plain text', async () => {
    const password = personaPassword(secret, 'cust-aino');
    expect(password).toMatch(/^[0-9a-f]{64}$/);
    expect(personaPassword('another-installation-secret-value', 'cust-aino')).not.toBe(password);
    await switchTo('cust-aino');
    const stored = await fixture.db.authIdentity.findFirst({ select: { password: true } });
    expect(stored?.password).toBeTruthy();
    expect(stored?.password).not.toContain(password);
  });
  it('is hidden when demo mode is off', async () => {
    vi.stubEnv('LEASE_LOOP_DEMO', 'false');
    expect((await switchTo('cust-aino')).status).toBe(404);
    expect(await fixture.db.user.count()).toBe(0);
  });
});
