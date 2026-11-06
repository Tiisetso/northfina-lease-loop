import { expect, it } from 'vitest';
import curvesData from '../../data/residual-curves.json';
import costsData from '../../data/refurbishment-costs.json';
import { refurbishmentCostsSchema, residualCurvesSchema } from '@/data/schemas';
import { returnPreview } from './return-preview';
it('keeps ordinary wear free at maturity but estimates new damage against the baseline', () => {
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
  expect(returnPreview(context, answers, 150).returnTotalCents).toBe(0);
  expect(returnPreview(context, { ...answers, cosmetic: 'deep' }, 150).damageTotalCents).toBe(9413);
});
