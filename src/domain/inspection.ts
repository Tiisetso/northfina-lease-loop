import type { AssetCategory, AssetCondition } from '@/data/schemas';

/**
 * What a professional records when assessing a returned item, and the rules that follow from it.
 *
 * The fields come from real inspection practice; RECOVERY.md lists the source of each one.
 * The result scale follows dealer checklists ("meets standard / adjust or repair / not applicable"),
 * extended with "wear" because lease returns must separate ordinary wear from damage.
 */
export const checkResults = ['pass', 'wear', 'repair', 'not_applicable', 'not_tested'] as const;
export type CheckResult = (typeof checkResults)[number];

/** How much a failed check says about the item, which limits the condition it can be graded. */
export type CheckGate = 'identity' | 'structural' | 'safety' | 'function' | 'condition';
export type CheckDefinition = { id: string; gate: CheckGate };

export const readingUnits = ['percent', 'mm', 'count', 'hours', 'bar'] as const;
export type ReadingUnit = (typeof readingUnits)[number];
export type ReadingDefinition = { id: string; unit: ReadingUnit; max: number };

export const usageSources = ['display', 'diagnostic_tool', 'service_record', 'customer'] as const;
export type UsageSource = (typeof usageSources)[number];
export const damageTypes = ['scratch', 'dent', 'crack', 'missing_part', 'liquid', 'other'] as const;
export type DamageType = (typeof damageTypes)[number];
export const damageLiabilities = ['existing', 'fair_wear', 'chargeable'] as const;
export type DamageLiability = (typeof damageLiabilities)[number];

export type InspectionCheck = {
  id: string;
  result: CheckResult;
  repairCents: number;
  note: string;
};
export type InspectionReading = { id: string; value: number | null };
export type DamageEntry = {
  area: string;
  type: DamageType;
  liability: DamageLiability;
  repairCents: number;
};
export type InspectionRecord = {
  usageSource: UsageSource;
  customerPresent: boolean;
  checks: InspectionCheck[];
  readings: InspectionReading[];
  damage: DamageEntry[];
};

const commonChecks: readonly CheckDefinition[] = [
  { id: 'serial_match', gate: 'identity' },
  { id: 'accessories_complete', gate: 'condition' },
  { id: 'service_records', gate: 'condition' },
];

const categoryChecks: Record<AssetCategory, readonly CheckDefinition[]> = {
  e_bike: [
    { id: 'frame_fork', gate: 'structural' },
    { id: 'brakes', gate: 'safety' },
    { id: 'battery_pack', gate: 'safety' },
    { id: 'wheels', gate: 'safety' },
    { id: 'tyres', gate: 'function' },
    { id: 'drivetrain', gate: 'function' },
    { id: 'motor_assist', gate: 'function' },
    { id: 'display_controls', gate: 'function' },
    { id: 'charging', gate: 'function' },
  ],
  laptop: [
    { id: 'chassis_hinges', gate: 'structural' },
    { id: 'battery_pack', gate: 'safety' },
    { id: 'power_on', gate: 'function' },
    { id: 'display', gate: 'function' },
    { id: 'keyboard', gate: 'function' },
    { id: 'trackpad', gate: 'function' },
    { id: 'ports', gate: 'function' },
    { id: 'wireless', gate: 'function' },
    { id: 'camera_audio', gate: 'function' },
    { id: 'charging', gate: 'function' },
    { id: 'storage', gate: 'function' },
  ],
  farm_machine: [
    { id: 'chassis_hitch', gate: 'structural' },
    { id: 'rops_seatbelt', gate: 'safety' },
    { id: 'pto_guard', gate: 'safety' },
    { id: 'brakes_steering', gate: 'safety' },
    { id: 'engine', gate: 'function' },
    { id: 'fluids', gate: 'function' },
    { id: 'hydraulics', gate: 'function' },
    { id: 'transmission_clutch', gate: 'function' },
    { id: 'pto_operation', gate: 'function' },
    { id: 'tyres', gate: 'function' },
    { id: 'electrics_lights', gate: 'function' },
  ],
};

const categoryReadings: Record<AssetCategory, readonly ReadingDefinition[]> = {
  e_bike: [
    { id: 'battery_health', unit: 'percent', max: 100 },
    { id: 'charge_cycles', unit: 'count', max: 100_000 },
    { id: 'brake_pad', unit: 'mm', max: 50 },
  ],
  laptop: [
    { id: 'battery_health', unit: 'percent', max: 100 },
    { id: 'storage_health', unit: 'percent', max: 100 },
    { id: 'dead_pixels', unit: 'count', max: 100_000 },
  ],
  farm_machine: [
    { id: 'tyre_tread', unit: 'mm', max: 200 },
    { id: 'last_service_hours', unit: 'hours', max: 1_000_000 },
    { id: 'hydraulic_pressure', unit: 'bar', max: 1_000 },
  ],
};

export function inspectionChecks(category: AssetCategory): readonly CheckDefinition[] {
  return [...commonChecks, ...categoryChecks[category]];
}

export function inspectionReadings(category: AssetCategory): readonly ReadingDefinition[] {
  return categoryReadings[category];
}

/** The customer's reported issues, mapped onto the checks where staff should look first. */
const issueChecks: Record<string, readonly string[]> = {
  missing_accessories: ['accessories_complete'],
  not_working: ['power_on', 'motor_assist', 'engine'],
  screen_damage: ['display'],
  keyboard_fault: ['keyboard'],
  network_fault: ['wireless'],
  charging_fault: ['charging'],
  battery_weak: ['battery_pack'],
  brakes_fault: ['brakes'],
  tyres_worn: ['tyres'],
  drive_fault: ['drivetrain'],
  engine_fault: ['engine'],
  hydraulic_fault: ['hydraulics'],
  service_due: ['service_records'],
};

export function reportedCheckIds(category: AssetCategory, issues: readonly string[]): string[] {
  const known = new Set(inspectionChecks(category).map((check) => check.id));
  const reported = issues.flatMap((issue) => issueChecks[issue] ?? []);
  return [...new Set(reported)].filter((id) => known.has(id));
}

const conditionOrder: readonly AssetCondition[] = ['poor', 'fair', 'good', 'like_new', 'new'];

export function conditionsUpTo(cap: AssetCondition): AssetCondition[] {
  return conditionOrder.slice(0, conditionOrder.indexOf(cap) + 1);
}

function lowerOf(a: AssetCondition, b: AssetCondition): AssetCondition {
  return conditionOrder.indexOf(a) < conditionOrder.indexOf(b) ? a : b;
}

const capForRepair: Record<CheckGate, AssetCondition> = {
  identity: 'poor',
  structural: 'poor',
  safety: 'fair',
  function: 'fair',
  condition: 'good',
};

/** Whole cents, non-negative: the only shape a repair amount may have. */
function validCents(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

export type InspectionEvaluation = {
  /** False when the record is incomplete or contradicts itself; the quote must not be saved. */
  ok: boolean;
  missingChecks: string[];
  invalidChecks: string[];
  invalidReadings: string[];
  invalidDamage: number[];
  /** The best condition the findings allow. A used item is never graded above like new. */
  conditionCap: AssetCondition;
  /** All repair lines, net. Standard tasks such as a data wipe are priced separately. */
  repairNetCents: number;
  /** The part of the repair lines the customer is responsible for, net. */
  chargeableNetCents: number;
  /** Checks that need work or were not tested. Each must pass a re-test before relisting. */
  openChecks: string[];
};

/**
 * Turns findings into a grade limit and repair totals. Like an auction grade, where structural
 * damage caps the grade whatever the rest looks like, the worst finding limits the condition:
 * structure or identity → poor, safety or function → fair, any wear or logged damage → good.
 */
export function evaluateInspection(
  category: AssetCategory,
  record: InspectionRecord
): InspectionEvaluation {
  const definitions = inspectionChecks(category);
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const answered = new Map(record.checks.map((check) => [check.id, check]));
  const missingChecks = definitions.map(({ id }) => id).filter((id) => !answered.has(id));
  const invalidChecks: string[] = [];
  const openChecks: string[] = [];
  let conditionCap: AssetCondition = 'like_new';
  let repairNetCents = 0;
  const seen = new Set<string>();

  for (const check of record.checks) {
    const definition = byId.get(check.id);
    const repeated = seen.has(check.id);
    seen.add(check.id);
    if (
      !definition ||
      repeated ||
      !validCents(check.repairCents) ||
      // Only a repair finding can carry a repair cost.
      (check.repairCents > 0 && check.result !== 'repair') ||
      // An item's identity can always be checked and cannot "wear".
      (definition.gate === 'identity' && ['wear', 'not_applicable'].includes(check.result))
    ) {
      invalidChecks.push(check.id);
      continue;
    }
    repairNetCents += check.repairCents;
    if (check.result === 'repair' || check.result === 'not_tested') openChecks.push(check.id);
    if (check.result === 'wear') conditionCap = lowerOf(conditionCap, 'good');
    if (check.result === 'repair')
      conditionCap = lowerOf(conditionCap, capForRepair[definition.gate]);
  }

  const readings = new Map(inspectionReadings(category).map((reading) => [reading.id, reading]));
  const invalidReadings = record.readings
    .filter((reading) => {
      const definition = readings.get(reading.id);
      if (!definition) return true;
      return (
        reading.value !== null &&
        (!Number.isFinite(reading.value) || reading.value < 0 || reading.value > definition.max)
      );
    })
    .map((reading) => reading.id);

  let chargeableNetCents = 0;
  const invalidDamage: number[] = [];
  record.damage.forEach((entry, index) => {
    if (!entry.area.trim() || !validCents(entry.repairCents)) {
      invalidDamage.push(index);
      return;
    }
    repairNetCents += entry.repairCents;
    if (entry.liability === 'chargeable') chargeableNetCents += entry.repairCents;
    conditionCap = lowerOf(conditionCap, 'good');
  });

  return {
    ok:
      !missingChecks.length &&
      !invalidChecks.length &&
      !invalidReadings.length &&
      !invalidDamage.length,
    missingChecks,
    invalidChecks,
    invalidReadings,
    invalidDamage,
    conditionCap,
    repairNetCents,
    chargeableNetCents,
    openChecks,
  };
}

/** Common refurbisher benchmark, not a standard: below it staff are prompted to consider a new battery. */
export const batteryHealthBenchmarkPercent = 80;

export function batteryBelowBenchmark(readings: readonly InspectionReading[]): boolean {
  const battery = readings.find((reading) => reading.id === 'battery_health')?.value;
  return battery !== undefined && battery !== null && battery < batteryHealthBenchmarkPercent;
}

/** One record per storage device, using the fields NIST SP 800-88 asks to be documented. */
export const sanitizationMethods = ['clear', 'purge', 'destroy'] as const;
export type SanitizationMethod = (typeof sanitizationMethods)[number];
export type SanitizationRecord = {
  storageModel: string;
  storageSerial: string;
  method: SanitizationMethod;
  technique: string;
  tool: string;
  verification: string;
};

export type WorkRecord = {
  completedWork: string[];
  retestedChecks: string[];
  sanitization: SanitizationRecord | null;
  notes: string;
};

export type RequiredSignoff = { work: string[]; retests: string[]; sanitization: boolean };

/** What must be confirmed after receipt. Legacy assessments have no checks to re-test. */
export function requiredSignoff(
  category: AssetCategory,
  workItems: readonly { id: string }[],
  record: InspectionRecord | undefined
): RequiredSignoff {
  return {
    work: workItems.map((item) => item.id),
    retests: record ? evaluateInspection(category, record).openChecks : [],
    sanitization: workItems.some((item) => item.id === 'certified_data_wipe'),
  };
}

function sanitizationComplete(record: SanitizationRecord | null) {
  return (
    record !== null &&
    [record.storageModel, record.storageSerial, record.technique, record.tool, record.verification]
      .map((field) => field.trim())
      .every(Boolean)
  );
}

/** Everything still missing. An empty result means the item may be marked ready. */
export function signoffGaps(required: RequiredSignoff, work: WorkRecord) {
  const gaps = {
    work: required.work.filter((id) => !work.completedWork.includes(id)),
    retests: required.retests.filter((id) => !work.retestedChecks.includes(id)),
    sanitization: required.sanitization && !sanitizationComplete(work.sanitization),
  };
  return { ...gaps, ok: !gaps.work.length && !gaps.retests.length && !gaps.sanitization };
}
