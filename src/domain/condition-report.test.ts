import { expect, expectTypeOf, it } from 'vitest';
import costsData from '../../data/refurbishment-costs.json';
import { refurbishmentCostsSchema, type AssetCondition } from '@/data/schemas';
import { conditionReport, conditionDamageCost, type ConditionAnswers } from './condition-report';
const costs = refurbishmentCostsSchema.parse(costsData);
const answers: ConditionAnswers = {
  power: 'working',
  batteryKnown: false,
  batteryHealth: null,
  functions: {
    screen_damage: 'working',
    network_fault: 'working',
    charging_fault: 'working',
    keyboard_fault: 'working',
  },
  cosmetic: 'same',
  accessories: 'complete',
};
it.each(['new', 'like_new'] as const)(
  'reports an undamaged %s item as like new without a damage charge',
  (baseline) => {
    const result = conditionReport(
      'laptop',
      baseline,
      { ...answers, batteryKnown: true, batteryHealth: 95 },
      costs
    );
    expectTypeOf(result.condition).toEqualTypeOf<Exclude<AssetCondition, 'new'>>();
    expect(result).toMatchObject({
      condition: 'like_new',
      issues: [],
      damageNetCents: 0,
      inspectionRequired: false,
    });
  }
);
it('does not charge pre-existing wear or ordinary light use', () => {
  expect(conditionDamageCost('fair', 'fair', costs.laptop)).toBe(0);
  expect(
    conditionReport('laptop', 'like_new', { ...answers, cosmetic: 'light' }, costs).damageNetCents
  ).toBe(0);
});
it('prices new cosmetic damage separately and flags unknown repair costs', () => {
  const result = conditionReport(
    'laptop',
    'good',
    {
      ...answers,
      cosmetic: 'deep',
      functions: {
        screen_damage: 'fault',
        network_fault: 'working',
        charging_fault: 'working',
        keyboard_fault: 'working',
      },
    },
    costs
  );
  expect(result.damageNetCents).toBe(7500);
  expect(result.condition).toBe('poor');
  expect(result.inspectionRequired).toBe(true);
});
it('validates battery and all applicable checks', () => {
  expect(() =>
    conditionReport('laptop', 'good', { ...answers, batteryKnown: true, batteryHealth: 101 }, costs)
  ).toThrow();
  expect(() => conditionReport('e_bike', 'good', answers, costs)).toThrow();
});
