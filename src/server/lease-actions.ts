import type { PrismaClient } from '@/generated/prisma/client';
import {
  loadCoefficientTable,
  loadRefurbishmentCosts,
  loadResidualCurves,
  loadVatRates,
} from '@/data/load';
import { assetCategorySchema, assetConditionSchema } from '@/data/schemas';
import { recoveryAgeMonths } from '@/domain/asset-recovery';
import { summarizeLease, paidForInvoice } from '@/domain/lease-dashboard';
import { settlementQuote } from '@/domain/lease-settlement';
import { monthlyFactorFor } from '@/domain/coefficient';
import { ApiError } from './api-response';
import { withAudit, type TransactionClient } from './audit';

async function context(
  database: PrismaClient | TransactionClient,
  customerId: string,
  contractId: string,
  today: string
) {
  const contract = await database.contract.findFirst({
    where: { id: contractId, customerId },
    include: {
      asset: true,
      invoices: { include: { payments: true } },
      actionPayments: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!contract) throw new ApiError(404, 'NOT_FOUND', 'Lease not found.');
  const [table, vat, curves, costs] = await Promise.all([
    loadCoefficientTable(),
    loadVatRates(),
    loadResidualCurves(),
    loadRefurbishmentCosts(),
  ]);
  const summary = summarizeLease(contract, vat.rates, today);
  if (!summary.forecast.ok)
    throw new ApiError(409, 'QUOTE_UNAVAILABLE', 'The schedule is unavailable.');
  const issued = new Set(
    contract.invoices.filter((i) => i.status === 'issued').map((i) => i.dueDate)
  );
  const unissued = summary.forecast.invoices.filter((i) => !issued.has(i.dueDate));
  const accrued = unissued.filter((i) => i.dueDate < today);
  const rate = vat.rates.find(
    (r) => r.valid_from <= today && (r.valid_to === null || r.valid_to >= today)
  );
  const band = monthlyFactorFor(
    table,
    contract.listPriceCents - contract.downPaymentCents,
    contract.termMonths
  );
  if (!rate || !band.ok)
    throw new ApiError(409, 'QUOTE_UNAVAILABLE', 'The quote basis is unavailable.');
  const finance = {
    monthlyNetCents: contract.monthlyNetCents,
    buyoutCents: contract.buyoutCents,
    remainingMonths: unissued.filter((i) => i.dueDate >= today).length,
    annualRateBasisPoints:
      contract.annualRateBasisPoints ?? Math.round(band.band.annual_interest_percent * 100),
    recoveryCents: 0,
    vatBasisPoints: Math.round(rate.rate_percent * 100),
    outstandingCents: summary.outstandingCents + accrued.reduce((s, i) => s + i.totalCents, 0),
  };
  const baselineCondition = assetConditionSchema.parse(
    contract.startCondition ?? contract.asset.condition
  );
  return {
    contract,
    finance,
    quote: settlementQuote(finance),
    accrued,
    curves,
    costs,
    baselineCondition,
    baselineUsage: contract.startUsageValue ?? contract.asset.usage_value,
    recoveryFacts: {
      category: assetCategorySchema.parse(contract.asset.category),
      originalPriceCents: contract.asset.originalPriceCents ?? contract.listPriceCents,
      ageMonths: recoveryAgeMonths(contract.asset.firstLeaseDate ?? contract.startDate, today),
      maintenanceUsageValue: contract.asset.maintenanceUsageValue,
    },
    today,
  };
}
export async function leaseActionContext(
  database: PrismaClient,
  customerId: string,
  contractId: string,
  today: string
) {
  return context(database, customerId, contractId, today);
}

/** Buying an owned demo lease is a price/payment action; no staff condition approval is involved. */
export async function payBuyout(
  database: PrismaClient,
  input: {
    customerId: string;
    userId: string;
    contractId: string;
    today: string;
    quoteDate: string;
    expectedTotalCents: number;
    token: string;
    paymentMethod: string;
  }
) {
  return withAudit(
    database,
    {
      actor: input.userId,
      action: 'lease.buyout_paid',
      entityType: 'contract',
      entityId: input.contractId,
    },
    async (tx) => {
      const previous = await tx.leaseActionPayment.findUnique({
        where: { reference: input.token },
        include: { contract: { select: { customerId: true } } },
      });
      if (previous) {
        if (
          previous.contractId !== input.contractId ||
          previous.contract.customerId !== input.customerId
        )
          throw new ApiError(409, 'CONFLICT', 'Payment reference already used.');
        return previous.id;
      }
      const data = await context(tx, input.customerId, input.contractId, input.today);
      if (data.contract.status !== 'active')
        throw new ApiError(409, 'LEASE_INACTIVE', 'The lease is not active.');
      if (!data.contract.isDemo)
        throw new ApiError(409, 'REAL_PAYMENT_REQUIRED', 'A real payment integration is required.');
      if (
        input.quoteDate !== input.today ||
        input.expectedTotalCents !== data.quote.buyoutTotalCents
      )
        throw new ApiError(409, 'QUOTE_CHANGED', 'Review the updated quote.');
      const receipt = await tx.leaseActionPayment.create({
        data: {
          contractId: input.contractId,
          reference: input.token,
          kind: 'buyout',
          amountCents: data.quote.buyoutTotalCents,
          paymentMethod: input.paymentMethod,
          quoteJson: JSON.stringify({ ...data.quote, ...data.finance, quoteDate: input.today }),
          isSimulated: true,
        },
      });
      for (const invoice of data.contract.invoices.filter((i) => i.status === 'issued')) {
        const unpaid = Math.max(
          0,
          invoice.netCents + invoice.vatCents - paidForInvoice(invoice, true)
        );
        if (unpaid)
          await tx.payment.create({
            data: {
              invoiceId: invoice.id,
              amountCents: unpaid,
              paidDate: input.today,
              isSimulated: true,
            },
          });
      }
      for (const invoice of data.accrued) {
        await tx.invoice.create({
          data: {
            contractId: input.contractId,
            dueDate: invoice.dueDate,
            issuedDate: input.today,
            netCents: invoice.netCents,
            vatBasisPoints: invoice.vatBasisPoints,
            vatCents: invoice.vatCents,
            payments: {
              create: { amountCents: invoice.totalCents, paidDate: input.today, isSimulated: true },
            },
          },
        });
      }
      await tx.leaseRequest.updateMany({
        where: { contractId: input.contractId, status: { in: ['pending', 'approved'] } },
        data: { status: 'cancelled' },
      });
      await tx.contract.update({ where: { id: input.contractId }, data: { status: 'bought' } });
      await tx.asset.update({ where: { id: data.contract.assetId }, data: { status: 'reserved' } });
      return receipt.id;
    }
  );
}
