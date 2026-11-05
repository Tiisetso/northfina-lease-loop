import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAssets } from '@/data/load';
import { createTestDb } from '../../tests/helpers/test-db';
import { toAssetRowData } from './assets';
import { withAudit } from './audit';
import { handleAuthMutation } from './auth-handler';
import { readIdentity } from './auth-session';

let fixture: Awaited<ReturnType<typeof createTestDb>>;
vi.mock('@/server/db', () => ({
  get db() {
    return fixture.db;
  },
}));
vi.mock('@/server/today', () => ({ todayIso: () => '2026-11-05' }));
import { POST } from '@/app/api/checkout/route';

const origin = 'http://localhost:3000';
const settings = {
  baseURL: origin,
  secret: 'test-only-secret-never-used-in-a-real-deployment',
  production: false,
};
const token = 'b4ef9210-1e71-4865-a6b7-46382a47aad4';
const body = {
  token,
  date: '2026-11-05',
  items: [
    {
      id: 'ebike-003',
      priceCents: 389000,
      monthlyTotalCents: 13466,
      version: 1,
      termMonths: 36,
      downPaymentCents: 0,
    },
  ],
  delivery: 'delivery',
  address: 'Test address 1',
  payment: 'card',
};
function request(cookie: string, value = body, site = origin) {
  return new Request(`${origin}/api/checkout`, {
    method: 'POST',
    headers: { origin: site, cookie, 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });
}
beforeEach(async () => {
  fixture = await createTestDb();
  vi.stubEnv('BETTER_AUTH_URL', origin);
  vi.stubEnv('BETTER_AUTH_SECRET', settings.secret);
  vi.stubEnv('NODE_ENV', 'test');
  const asset = (await loadAssets()).find((item) => item.id === 'ebike-003');
  if (!asset) throw new Error('Missing asset');
  await withAudit(
    fixture.db,
    { actor: 'test', action: 'test.setup', entityType: 'asset', entityId: asset.id },
    (tx) => tx.asset.create({ data: toAssetRowData(asset) })
  );
});
afterEach(async () => {
  await fixture.cleanup();
  vi.unstubAllEnvs();
});
async function customer() {
  const response = await handleAuthMutation(
    fixture.db,
    new Request(`${origin}/api/auth/register`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Customer',
        email: 'checkout@example.com',
        password: 'automated-test-passphrase-only',
      }),
    }),
    'register',
    settings
  );
  const cookie = response.headers
    .getSetCookie()
    .map((item) => item.split(';')[0])
    .join('; ');
  const identity = await readIdentity(fixture.db, new Headers({ cookie }), settings);
  if (!identity) throw new Error('Missing session');
  return { cookie, identity };
}
describe('simulated checkout', () => {
  it('requires authentication, validates quotes, and rejects cross-origin writes', async () => {
    expect((await POST(request(''), undefined)).status).toBe(401);
    const { cookie } = await customer();
    expect((await POST(request(cookie, body, 'https://invalid.example'), undefined)).status).toBe(
      403
    );
    expect(
      (
        await POST(
          request(cookie, { ...body, items: [{ ...body.items[0]!, priceCents: 1 }] }),
          undefined
        )
      ).status
    ).toBe(409);
    expect(await fixture.db.contract.count()).toBe(0);
  });
  it('creates an audited simulated lease once, without claiming payment', async () => {
    const { cookie, identity } = await customer();
    expect((await POST(request(cookie), undefined)).status).toBe(201);
    expect((await POST(request(cookie), undefined)).status).toBe(201);
    const contracts = await fixture.db.contract.findMany({ include: { invoices: true } });
    expect(contracts).toHaveLength(1);
    expect(contracts[0]).toMatchObject({
      customerId: identity.customerId,
      assetId: 'ebike-003',
      isDemo: true,
      monthlyNetCents: 10730,
      downPaymentCents: 0,
    });
    expect(contracts[0]?.invoices).toHaveLength(0);
    expect(
      await fixture.db.auditLog.count({ where: { action: 'lease.simulated_checkout' } })
    ).toBeGreaterThan(0);
  });
});
