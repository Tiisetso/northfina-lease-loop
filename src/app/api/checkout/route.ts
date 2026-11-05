import { z } from 'zod';
import { checkoutQuote } from '@/domain/checkout-quote';
import { ApiError, handleRoute, ok, readJsonBody } from '@/server/api-response';
import { authSettings } from '@/server/auth-config';
import { assertSameOrigin } from '@/server/auth-input';
import { requireIdentity } from '@/server/auth-session';
import { withAudit } from '@/server/audit';
import { checkoutOptions } from '@/server/checkout-options';
import { db } from '@/server/db';
import { todayIso } from '@/server/today';

const schema = z.strictObject({
  token: z.uuid(),
  date: z.iso.date(),
  items: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(80),
        priceCents: z.number().int().nonnegative(),
        monthlyTotalCents: z.number().int().nonnegative(),
        version: z.number().int(),
        termMonths: z.number().int().min(1).max(60),
        downPaymentCents: z.number().int().nonnegative(),
      })
    )
    .min(1)
    .max(10),
  delivery: z.enum(['delivery', 'pickup']),
  address: z.string().trim().min(3).max(200),
  payment: z.enum(['card', 'invoice']),
});

async function checkoutBody(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json')
    throw new ApiError(415, 'INVALID_CONTENT_TYPE', 'JSON is required.');
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.length;
        if (size > 8192) {
          await reader.cancel();
          throw new ApiError(413, 'TOO_LARGE', 'Request is too large.');
        }
        chunks.push(next.value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return readJsonBody(new Request(request.url, { method: 'POST', body: bytes }), schema);
}

export const POST = handleRoute(async (request) => {
  assertSameOrigin(request, authSettings());
  const identity = await requireIdentity(db, request.headers);
  if (Number(request.headers.get('content-length') ?? 0) > 8192)
    throw new ApiError(413, 'TOO_LARGE', 'Request is too large.');
  const input = await checkoutBody(request);
  if (new Set(input.items.map((item) => item.id)).size !== input.items.length)
    throw new ApiError(400, 'INVALID_CART', 'Duplicate items.');
  const today = todayIso();
  if (input.date !== today) throw new ApiError(409, 'QUOTE_CHANGED', 'The quote date has changed.');
  const data = await checkoutOptions(today);
  const quotes = input.items.map((item) => {
    const option = data.options.find((option) => option.id === item.id);
    const calculated =
      option &&
      checkoutQuote(
        option.priceCents,
        item.downPaymentCents,
        item.termMonths,
        today,
        data.table,
        data.rates
      );
    if (
      !option ||
      !calculated ||
      !option.available ||
      option.priceCents !== item.priceCents ||
      calculated.monthlyTotalCents !== item.monthlyTotalCents ||
      option.priceListVersion !== item.version
    )
      throw new ApiError(409, 'QUOTE_CHANGED', 'A product or its price has changed.');
    return {
      ...option,
      ...calculated,
      termMonths: item.termMonths,
      downPaymentCents: item.downPaymentCents,
    };
  });
  const ids = quotes.map((quote) => `demo-${input.token}-${quote.id}`);
  await withAudit(
    db,
    {
      actor: identity.id,
      action: 'lease.simulated_checkout',
      entityType: 'customer',
      entityId: identity.customerId,
      details: { delivery: input.delivery, payment: input.payment, count: quotes.length },
    },
    async (tx) => {
      const existing = await tx.contract.findMany({
        where: { id: { in: ids } },
        select: { id: true, customerId: true },
      });
      if (existing.length) {
        if (
          existing.length === ids.length &&
          existing.every((item) => item.customerId === identity.customerId)
        )
          return;
        throw new ApiError(409, 'CHECKOUT_CONFLICT', 'Checkout cannot be repeated.');
      }
      for (const [index, quote] of quotes.entries()) {
        const asset = await tx.asset.findUnique({
          where: { id: quote.id },
          select: { status: true },
        });
        if (!asset || asset.status !== 'available')
          throw new ApiError(409, 'QUOTE_CHANGED', 'A product is unavailable.');
        await tx.contract.create({
          data: {
            id: ids[index]!,
            customerId: identity.customerId,
            assetId: quote.id,
            startDate: today,
            termMonths: quote.termMonths,
            listPriceCents: quote.priceCents,
            downPaymentCents: quote.downPaymentCents,
            monthlyNetCents: quote.monthlyNetCents,
            buyoutCents: quote.buyoutCents,
            priceListVersion: quote.priceListVersion,
            isDemo: true,
            events: { create: { kind: 'signed', eventDate: today } },
          },
        });
      }
    }
  );
  return ok({ ids }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
});
