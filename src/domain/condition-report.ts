import type { AssetCategory, AssetCondition, RefurbishmentCosts } from '@/data/schemas';

export type CheckAnswer = 'working' | 'fault' | 'unknown';
export type ConditionAnswers = {
  power: CheckAnswer;
  batteryKnown: boolean;
  batteryHealth: number | null;
  functions: Record<string, CheckAnswer>;
  cosmetic: 'same' | 'light' | 'deep' | 'broken';
  accessories: 'complete' | 'missing' | 'unknown';
};
export const categoryChecks: Record<AssetCategory, readonly string[]> = {
  laptop: ['screen_damage', 'keyboard_fault', 'network_fault', 'charging_fault'],
  e_bike: ['brakes_fault', 'tyres_worn', 'drive_fault'],
  farm_machine: ['engine_fault', 'hydraulic_fault', 'service_due'],
};
const grades: readonly AssetCondition[] = ['poor', 'fair', 'good', 'like_new', 'new'];

/** Normal use may move a new/like-new item to good; previous damage is never charged again. */
export function conditionDamageCost(
  baseline: AssetCondition,
  returned: AssetCondition,
  costs: RefurbishmentCosts[AssetCategory]
) {
  const target = Math.min(grades.indexOf(baseline), grades.indexOf('good'));
  const start = grades.indexOf(returned);
  if (target < 0 || start < 0) throw new RangeError('Invalid condition');
  let amount = 0;
  for (let index = start; index < target; index++) {
    const cost = costs.condition_upgrades[`${grades[index]}->${grades[index + 1]}`];
    if (!Number.isSafeInteger(cost) || cost! < 0) throw new RangeError('Missing repair cost');
    amount += cost!;
  }
  return amount;
}

/** Convert observable answers into a provisional report; unknowns require inspection, not a made-up repair fee. */
export function conditionReport(
  category: AssetCategory,
  baseline: AssetCondition,
  answers: ConditionAnswers,
  costs: RefurbishmentCosts
) {
  if (
    answers.batteryKnown &&
    (!Number.isInteger(answers.batteryHealth) ||
      answers.batteryHealth! < 0 ||
      answers.batteryHealth! > 100)
  )
    throw new RangeError('Invalid battery health');
  if (
    categoryChecks[category].some(
      (key) => !['working', 'fault', 'unknown'].includes(answers.functions[key] ?? '')
    )
  )
    throw new RangeError('Incomplete functional checks');
  const baselineIndex = Math.min(grades.indexOf(baseline), grades.indexOf('like_new'));
  const cosmeticIndex =
    answers.cosmetic === 'broken'
      ? 0
      : answers.cosmetic === 'deep'
        ? 1
        : answers.cosmetic === 'light'
          ? 2
          : baselineIndex;
  const cosmeticCondition = grades[Math.min(baselineIndex, cosmeticIndex)]!;
  const faults = categoryChecks[category].filter((key) => answers.functions[key] === 'fault');
  const issues = [...faults];
  if (answers.power === 'fault') issues.push('not_working');
  if (answers.cosmetic === 'light') issues.push('cosmetic_scratches');
  if (answers.cosmetic === 'deep' || answers.cosmetic === 'broken') issues.push('dents');
  if (answers.accessories === 'missing') issues.push('missing_accessories');
  if (answers.batteryKnown && answers.batteryHealth! < 80) issues.push('battery_weak');
  return {
    condition: (answers.power === 'fault' || faults.length
      ? 'poor'
      : cosmeticCondition) as AssetCondition,
    issues: [...new Set(issues)],
    damageNetCents: conditionDamageCost(baseline, cosmeticCondition, costs[category]),
    inspectionRequired:
      answers.cosmetic === 'deep' ||
      answers.cosmetic === 'broken' ||
      answers.power !== 'working' ||
      faults.length > 0 ||
      Object.values(answers.functions).includes('unknown') ||
      answers.accessories !== 'complete' ||
      (category !== 'farm_machine' && !answers.batteryKnown),
    policyVersion: 'condition-v1',
  };
}
