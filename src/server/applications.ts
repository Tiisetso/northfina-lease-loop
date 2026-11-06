import { z } from 'zod';
import type { PrismaClient } from '@/generated/prisma/client';
import type { QuestionsFile } from '@/data/schemas';
import { assetCategorySchema } from '@/data/schemas';
import { assessApplication } from '@/domain/application';
import {
  applicationCart,
  sameApplicationItems,
  type ApplicationQuoteItem,
} from '@/domain/application-cart';
import { ApiError } from './api-response';
import type { ApplicationInput } from './application-input';
import { applicationSelectionSchema } from './application-input';
import { withAudit, type TransactionClient } from './audit';
import type { AccountIdentity } from './auth-session';
import type { CheckoutData } from './checkout-options';

export const applicationItemsSchema = z
  .array(
    applicationSelectionSchema.extend({
      name: z.string(),
      category: assetCategorySchema,
      available: z.boolean(),
      priceCents: z.number().int().nonnegative(),
      priceListVersion: z.number().int(),
      monthlyNetCents: z.number().int().nonnegative(),
      monthlyTotalCents: z.number().int().nonnegative(),
      buyoutCents: z.number().int().nonnegative(),
      totalCents: z.number().int().nonnegative(),
    })
  )
  .min(1)
  .max(10);

export async function createLeaseApplication(
  database: PrismaClient,
  identity: AccountIdentity,
  input: ApplicationInput,
  data: CheckoutData,
  bank: QuestionsFile
) {
  const cart = applicationCart(data, input.items);
  if (!cart) throw new ApiError(409, 'QUOTE_CHANGED', 'Please review your cart.');
  const result = assessApplication(bank, cart.context, input.answers);
  if (result.status === 'incomplete')
    throw new ApiError(422, 'INCOMPLETE_APPLICATION', 'Please check your answers.', {
      questions: result.missing,
    });
  return withAudit(
    database,
    {
      actor: identity.id,
      action: 'application.submitted',
      entityType: 'customer',
      entityId: identity.customerId,
      details: { status: result.status, reasons: result.reasons, itemCount: cart.items.length },
    },
    (tx) =>
      tx.leaseApplication.create({
        data: {
          customerId: identity.customerId,
          startDate: data.today,
          status: result.status,
          answersJson: JSON.stringify(result.answers),
          reasonsJson: JSON.stringify(result.reasons),
          itemsJson: JSON.stringify(cart.items),
        },
        select: { id: true, status: true },
      })
  );
}

export async function findCustomerApplication(
  database: PrismaClient,
  customerId: string,
  id: string
) {
  return database.leaseApplication.findFirst({ where: { id, customerId } });
}

/** Called inside the checkout write transaction; neither a client flag nor another customer's ID is approval. */
export async function requireApplicationApproval(
  tx: TransactionClient,
  customerId: string,
  id: string,
  items: readonly ApplicationQuoteItem[],
  today: string
) {
  const application = await tx.leaseApplication.findFirst({ where: { id, customerId } });
  if (!application || application.status !== 'approved')
    throw new ApiError(403, 'APPLICATION_NOT_APPROVED', 'An approved application is required.');
  if (
    application.startDate !== today ||
    !sameApplicationItems(applicationItemsSchema.parse(JSON.parse(application.itemsJson)), items)
  ) {
    throw new ApiError(
      409,
      'APPLICATION_CHANGED',
      'Please apply again for the current cart and price.'
    );
  }
}
