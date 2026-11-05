import { z } from 'zod';
import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { assetCategorySchema, assetConditionSchema, usageUnitSchema } from '@/data/schemas';
import { canRequestLeaseChange, type RequestKind } from '@/domain/lease-insights';
import { ApiError } from './api-response';
import { withAudit } from './audit';

const contractStatus = z.enum(['active', 'completed', 'returned', 'bought']);
const requestStatus = z.enum(['pending', 'approved', 'rejected', 'cancelled']);
const requestKind = z.enum(['return', 'buyout', 'exchange']);
const eventKind = z.enum(['signed', 'payment', 'returned', 'refurbished']);

const include = {
  asset: {
    select: {
      id: true,
      category: true,
      make: true,
      model: true,
      model_year: true,
      condition: true,
      usage_unit: true,
      usage_value: true,
      previous_lives: true,
    },
  },
  invoices: { include: { payments: true }, orderBy: { dueDate: 'asc' as const } },
  requests: { orderBy: { createdAt: 'desc' as const } },
  events: { orderBy: { eventDate: 'desc' as const } },
};

export async function listCustomerLeases(db: PrismaClient, customerId: string) {
  const contracts = await db.contract.findMany({
    where: { customerId },
    include,
    orderBy: { createdAt: 'desc' },
  });
  return contracts.map(validateLease);
}

export type CustomerLease = Awaited<ReturnType<typeof listCustomerLeases>>[number];

export async function findCustomerLease(db: PrismaClient, customerId: string, contractId: string) {
  const contract = await db.contract.findFirst({ where: { id: contractId, customerId }, include });
  return contract ? validateLease(contract) : null;
}

function validateLease(contract: Prisma.ContractGetPayload<{ include: typeof include }>) {
  return {
    ...contract,
    status: contractStatus.parse(contract.status),
    asset: {
      ...contract.asset,
      category: assetCategorySchema.parse(contract.asset.category),
      condition: assetConditionSchema.parse(contract.asset.condition),
      usage_unit: usageUnitSchema.parse(contract.asset.usage_unit),
    },
    requests: contract.requests.map((request) => ({
      ...request,
      status: requestStatus.parse(request.status),
      kind: requestKind.parse(request.kind),
    })),
    events: contract.events.map((event) => ({ ...event, kind: eventKind.parse(event.kind) })),
  };
}

/** Ownership and eligibility are checked again within the same audited transaction. */
export async function requestLeaseChange(
  db: PrismaClient,
  input: { customerId: string; userId: string; contractId: string; kind: RequestKind }
) {
  return withAudit(
    db,
    {
      actor: input.userId,
      action: 'lease.requested',
      entityType: 'contract',
      entityId: input.contractId,
      details: { kind: input.kind },
    },
    async (tx) => {
      const contract = await tx.contract.findFirst({
        where: { id: input.contractId, customerId: input.customerId },
        include: { requests: { where: { status: 'pending' } } },
      });
      if (!contract) throw new ApiError(404, 'NOT_FOUND', 'Lease not found.');
      const allowed = canRequestLeaseChange(
        contractStatus.parse(contract.status),
        contract.requests.length
      );
      if (allowed !== 'allowed')
        throw new ApiError(409, 'REQUEST_UNAVAILABLE', 'This request is unavailable.');
      return tx.leaseRequest.create({ data: { contractId: contract.id, kind: input.kind } });
    }
  );
}
