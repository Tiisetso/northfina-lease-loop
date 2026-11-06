import type { PrismaClient } from '@/generated/prisma/client';
import { ApiError } from './api-response';
import { withAudit } from './audit';

export async function cancelLeaseRequest(
  db: PrismaClient,
  input: { customerId: string; userId: string; contractId: string; requestId: string }
) {
  return withAudit(
    db,
    {
      actor: input.userId,
      action: 'lease.request_cancelled',
      entityType: 'lease_request',
      entityId: input.requestId,
    },
    async (tx) => {
      const request = await tx.leaseRequest.findFirst({
        where: {
          id: input.requestId,
          contractId: input.contractId,
          contract: { customerId: input.customerId },
        },
        include: { assessment: true, contract: { select: { status: true } } },
      });
      if (!request) throw new ApiError(404, 'NOT_FOUND', 'Request not found.');
      if (request.status === 'cancelled') return request.id;
      if (
        request.contract.status !== 'active' ||
        !['pending', 'approved'].includes(request.status) ||
        (request.assessment && !['quoted', 'accepted'].includes(request.assessment.status))
      )
        throw new ApiError(
          409,
          'CANNOT_CANCEL',
          'The item has already been received or this request is closed.'
        );
      if (request.assessment)
        await tx.returnAssessment.update({
          where: { id: request.assessment.id },
          data: { status: 'cancelled' },
        });
      await tx.leaseRequest.update({ where: { id: request.id }, data: { status: 'cancelled' } });
      return request.id;
    }
  );
}
