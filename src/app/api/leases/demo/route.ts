import { fail, handleRoute, ok } from '@/server/api-response';
import { authSettings } from '@/server/auth-config';
import { assertSameOrigin } from '@/server/auth-input';
import { requireIdentity } from '@/server/auth-session';
import { db } from '@/server/db';
import { createDemoLease } from '@/server/demo-lease';
import { todayIso } from '@/server/today';

export const POST = handleRoute(async (request) => {
  if (process.env.NODE_ENV !== 'development') return fail(404, 'NOT_FOUND', 'Not found.');
  assertSameOrigin(request, authSettings());
  const identity = await requireIdentity(db, request.headers);
  const id = await createDemoLease(db, {
    customerId: identity.customerId,
    userId: identity.id,
    today: todayIso(),
  });
  return ok({ id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
});
