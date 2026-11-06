import { expect, it } from 'vitest';
import costsData from '../../data/refurbishment-costs.json';
import { refurbishmentCostsSchema } from '@/data/schemas';
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
