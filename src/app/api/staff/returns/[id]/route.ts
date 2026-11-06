import { handleRoute, ok } from '@/server/api-response';
import { authSettings } from '@/server/auth-config';
import { assertSameOrigin } from '@/server/auth-input';
import { requireStaff } from '@/server/auth-session';
import { db } from '@/server/db';
import { assessReturn, progressReturn } from '@/server/recovery';
import { readRecoveryBody, staffRecoveryActionSchema } from '@/server/recovery-input';
import { todayIso } from '@/server/today';

export const POST = handleRoute(
  async (request, { params }: RouteContext<'/api/staff/returns/[id]'>) => {
    assertSameOrigin(request, authSettings());
    const staff = await requireStaff(db, request.headers);
    const { id } = await params;
    const input = await readRecoveryBody(request, staffRecoveryActionSchema);
    const today = todayIso();
    const result =
      input.action === 'assess'
        ? await assessReturn(db, {
            requestId: id,
            staffId: staff.id,
            today,
            inspection: {
              condition: input.condition,
              targetCondition: input.targetCondition,
              usageValue: input.usageValue,
              ageMonths: input.ageMonths,
              additionalRepairCents: input.additionalRepairCents,
              notes: input.notes,
            },
          })
        : await progressReturn(db, {
            requestId: id,
            staffId: staff.id,
            today,
            action: input.action,
          });
    return ok(
      { id: result.id, status: result.status },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
);
