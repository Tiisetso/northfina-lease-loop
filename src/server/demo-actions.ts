// The two demo-mode actions: set the demo date, and sign in as a data-pack persona.
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import type { PrismaClient } from '@/generated/prisma/client';
import { loadCustomers } from '@/data/load';
import { parseDemoDate } from '@/domain/demo';
import { ApiError, ok, readJsonBody } from './api-response';
import { withAudit, type AuditEntry } from './audit';
import { authSettings, createAuth, type AuthSettings } from './auth-config';
import { assertSameOrigin } from './auth-input';
import { readIdentity } from './auth-session';
import { DEMO_DATE_COOKIE, requireDemoMode } from './demo-mode';

export const DEMO_STAFF = {
  id: 'demo-staff',
  name: 'Demo staff',
  email: 'demo.staff@example.com',
} as const;

const dateSchema = z.strictObject({ date: z.string().max(20).nullable() });
const personaSchema = z.strictObject({ personaId: z.string().min(1).max(80) });

/** POST { date: "YYYY-MM-DD" } sets the demo date; { date: null } returns to the real date. */
export async function setDemoDate(
  database: PrismaClient,
  request: Request,
  settings: AuthSettings = authSettings()
): Promise<Response> {
  requireDemoMode();
  assertSameOrigin(request, settings);
  const { date: raw } = await readJsonBody(request, dateSchema);
  const date = raw === null ? null : parseDemoDate(raw);
  if (raw !== null && date === null)
    throw new ApiError(400, 'INVALID_DEMO_DATE', 'Choose a date in the demo range.');
  const identity = await readIdentity(database, request.headers, settings);
  await withAudit(
    database,
    {
      actor: identity?.id ?? 'anonymous',
      action: date ? 'demo.date_set' : 'demo.date_cleared',
      entityType: 'demo',
      entityId: 'clock',
      details: { date },
    },
    async () => undefined
  );
  const response = ok({ date }, { headers: { 'Cache-Control': 'no-store' } });
  const secure = settings.production ? '; Secure' : '';
  response.headers.append(
    'Set-Cookie',
    date
      ? `${DEMO_DATE_COOKIE}=${date}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`
      : `${DEMO_DATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  );
  return response;
}

/**
 * A persona's password: derived from the server's auth secret, so it is never stored,
 * committed or known to anyone, and differs on every installation.
 */
export function personaPassword(secret: string, personaId: string): string {
  return createHmac('sha256', secret).update(`lease-loop-demo-persona:${personaId}`).digest('hex');
}

export async function demoPersonas() {
  const customers = await loadCustomers();
  return [
    ...customers.map(({ id, name, email, type }) => ({ id, name, email, type, staff: false })),
    { ...DEMO_STAFF, type: 'staff' as const, staff: true },
  ];
}

/**
 * POST { personaId } signs this browser in as a persona. The account is created on first use
 * through the library's normal sign-up, then signed in through its normal sign-in, so no
 * session or cookie is hand-made. Account creation, sign-in and audit share one transaction.
 */
export async function switchPersona(
  database: PrismaClient,
  request: Request,
  settings: AuthSettings = authSettings()
): Promise<Response> {
  requireDemoMode();
  assertSameOrigin(request, settings);
  const { personaId } = await readJsonBody(request, personaSchema);
  const persona = (await demoPersonas()).find((item) => item.id === personaId);
  if (!persona) throw new ApiError(404, 'NOT_FOUND', 'Unknown persona.');
  const password = personaPassword(settings.secret, persona.id);
  const customerId = persona.staff ? `${persona.id}-customer` : persona.id;

  const entry: AuditEntry = {
    actor: 'anonymous',
    action: 'demo.persona_switched',
    entityType: 'customer',
    entityId: customerId,
  };
  return withAudit(database, entry, async (tx) => {
    const auth = createAuth(tx, settings);
    const invoke = (path: string, body: unknown) =>
      auth.handler(
        new Request(`${settings.baseURL}/api/auth/${path}`, {
          method: 'POST',
          headers: { origin: settings.baseURL, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
      );
    const existing = await tx.user.findUnique({
      where: { email: persona.email },
      select: { customer: { select: { id: true } } },
    });
    if (existing && existing.customer?.id !== customerId)
      throw new ApiError(409, 'PERSONA_UNAVAILABLE', 'This persona is unavailable.');
    if (!existing) {
      const created = await invoke('sign-up/email', {
        name: persona.name,
        email: persona.email,
        password,
      });
      if (!created.ok) throw new ApiError(500, 'DEMO_UNAVAILABLE', 'The persona failed.');
      const { user }: { user: { id: string } } = await created.json();
      await tx.customer.create({ data: { id: customerId, ownerUserId: user.id } });
      if (persona.staff) await tx.user.update({ where: { id: user.id }, data: { role: 'staff' } });
    }
    const signedIn = await invoke('sign-in/email', { email: persona.email, password });
    if (signedIn.status === 429)
      throw new ApiError(429, 'RATE_LIMITED', 'Please try again in a minute.');
    if (!signedIn.ok) throw new ApiError(500, 'DEMO_UNAVAILABLE', 'The persona failed.');
    const { user }: { user: { id: string } } = await signedIn.json();
    // withAudit writes the entry after this work, so it records the signed-in account.
    entry.actor = user.id;
    const response = ok({ personaId: persona.id }, { headers: { 'Cache-Control': 'no-store' } });
    for (const cookie of signedIn.headers.getSetCookie())
      response.headers.append('Set-Cookie', cookie);
    return response;
  });
}
