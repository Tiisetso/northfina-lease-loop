import { loadQuestions } from '@/data/load';
import { handleRoute, ok } from '@/server/api-response';
import { readApplicationInput } from '@/server/application-input';
import { createLeaseApplication } from '@/server/applications';
import { authSettings } from '@/server/auth-config';
import { assertSameOrigin } from '@/server/auth-input';
import { requireIdentity } from '@/server/auth-session';
import { checkoutOptions } from '@/server/checkout-options';
import { db } from '@/server/db';
import { todayIso } from '@/server/today';

export const POST = handleRoute(async (request) => {
  assertSameOrigin(request, authSettings());
  const identity = await requireIdentity(db, request.headers);
  const input = await readApplicationInput(request);
  const [data, bank] = await Promise.all([checkoutOptions(todayIso()), loadQuestions()]);
  const result = await createLeaseApplication(db, identity, input, data, bank);
  return ok(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
});
