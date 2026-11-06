import { z } from 'zod';
import { assetConditionSchema } from '@/data/schemas';
import { ApiError, readJsonBody } from './api-response';

export const reportIssuesByCategory = {
  e_bike: [
    'cosmetic_scratches',
    'dents',
    'missing_accessories',
    'not_working',
    'brakes_fault',
    'tyres_worn',
    'drive_fault',
    'battery_weak',
  ],
  laptop: [
    'cosmetic_scratches',
    'dents',
    'missing_accessories',
    'not_working',
    'screen_damage',
    'keyboard_fault',
    'battery_weak',
  ],
  farm_machine: [
    'cosmetic_scratches',
    'dents',
    'missing_accessories',
    'not_working',
    'engine_fault',
    'hydraulic_fault',
    'service_due',
  ],
} as const;
export const recoveryReportSchema = z.strictObject({
  condition: assetConditionSchema,
  usageValue: z.number().int().min(0).max(100_000_000),
  issues: z.array(z.string().max(60)).max(20),
  notes: z.string().trim().max(1000).default(''),
  preferredDate: z.iso.date().optional(),
});
export type RecoveryReport = z.infer<typeof recoveryReportSchema>;
export const inspectionSchema = z.strictObject({
  condition: assetConditionSchema,
  targetCondition: z.enum(['good', 'like_new']),
  usageValue: z.number().int().min(0).max(100_000_000),
  ageMonths: z.number().int().min(0).max(1200),
  additionalRepairCents: z.number().int().min(0).max(25_000_000),
  notes: z.string().trim().min(1).max(1000),
});
export type RecoveryInspection = z.infer<typeof inspectionSchema>;
export const recoveryCalculationSchema = z.object({
  quoteDate: z.iso.date(),
  originalPriceCents: z.number().int().nonnegative(),
  firstLeaseDate: z.iso.date(),
  ageMonths: z.number().int().nonnegative(),
  annualRateBasisPoints: z.number().int().nonnegative(),
  rateSource: z.string(),
  vatBasisPoints: z.number().int().nonnegative(),
  outstandingInvoiceCents: z.number().int().nonnegative().default(0),
  accruedUnissuedCents: z.number().int().nonnegative().default(0),
  recovery: z.object({
    asReturnedValueCents: z.number().int().nonnegative(),
    postRepairValueCents: z.number().int().nonnegative(),
    refurbishmentCostCents: z.number().int().nonnegative(),
    netRecoveryCents: z.number().int(),
    workItems: z.array(
      z.object({ id: z.string(), costCents: z.number().int().nonnegative(), reason: z.string() })
    ),
    valueUpliftCents: z.number().int(),
    policyVersion: z.string(),
  }),
  settlement: z.object({
    buyoutNetCents: z.number().int().nonnegative(),
    buyoutTotalCents: z.number().int().nonnegative(),
    returnNetCents: z.number().int().nonnegative(),
    returnTotalCents: z.number().int().nonnegative(),
    remainingRentNetCents: z.number().int().nonnegative(),
    policyVersion: z.string(),
  }),
});
export type RecoveryCalculation = z.infer<typeof recoveryCalculationSchema>;
export const staffRecoveryActionSchema = z.discriminatedUnion('action', [
  inspectionSchema.extend({ action: z.literal('assess') }),
  z.strictObject({ action: z.literal('receive') }),
  z.strictObject({ action: z.literal('publish'), workCompleted: z.literal(true) }),
  z.strictObject({ action: z.literal('retire') }),
]);
export type StaffRecoveryAction = z.infer<typeof staffRecoveryActionSchema>;

/** Bound JSON even when Content-Length is omitted; return the app's safe API errors. */
export async function readRecoveryBody<S extends z.ZodType>(request: Request, schema: S) {
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
