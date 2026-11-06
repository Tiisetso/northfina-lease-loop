import { expect, it } from 'vitest';
import curvesData from '../../data/residual-curves.json';
import costsData from '../../data/refurbishment-costs.json';
import { refurbishmentCostsSchema, residualCurvesSchema } from '@/data/schemas';
import { returnPreview } from './return-preview';
const context = {
  baselineCondition: 'good' as const,
  recoveryFacts: {
    category: 'laptop' as const,
    originalPriceCents: 200000,
    ageMonths: 24,
    maintenanceUsageValue: 0,
  },
  finance: {
    monthlyNetCents: 10000,
    buyoutCents: 50000,
    remainingMonths: 0,
    annualRateBasisPoints: 790,
    recoveryCents: 0,
    vatBasisPoints: 2550,
    outstandingCents: 0,
  },
  costs: refurbishmentCostsSchema.parse(costsData),
  curves: residualCurvesSchema.parse(curvesData),
};
const answers = {
  power: 'working' as const,
  batteryKnown: false,
  batteryHealth: null,
  functions: {
    screen_damage: 'working' as const,
    network_fault: 'working' as const,
    charging_fault: 'working' as const,
    keyboard_fault: 'working' as const,
  },
  cosmetic: 'light' as const,
  accessories: 'complete' as const,
};
it('keeps ordinary wear free at maturity but estimates new damage against the baseline', () => {
  expect(returnPreview(context, answers, 150).returnTotalCents).toBe(0);
  expect(returnPreview(context, { ...answers, cosmetic: 'deep' }, 150).damageTotalCents).toBe(9413);
});

it.each(['new', 'like_new'] as const)(
  'preserves an undamaged %s item as like new in the return preview',
  (baselineCondition) => {
    const result = returnPreview(
      { ...context, baselineCondition },
      { ...answers, cosmetic: 'same', batteryKnown: true, batteryHealth: 95 },
      150
    );
    // 200000 cents × 40% at 24 months × 95% condition × 98.5% usage = 74860 net;
    // VAT is rounded once, half up: 19089 cents, giving 93949 cents in total.
    expect(result).toMatchObject({
      condition: 'like_new',
      issues: [],
      inspectionRequired: false,
      itemValueTotalCents: 93949,
      damageNetCents: 0,
      damageTotalCents: 0,
      returnTotalCents: 0,
    });
  }
);
