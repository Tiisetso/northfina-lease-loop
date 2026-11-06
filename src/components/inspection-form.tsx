'use client';

import { useState, type FormEvent } from 'react';
import type { AssetCategory, AssetCondition } from '@/data/schemas';
import { parseEuroCents } from '@/domain/application-fields';
import { netFromGross } from '@/domain/gross-money';
import {
  batteryBelowBenchmark,
  checkResults,
  conditionsUpTo,
  damageLiabilities,
  damageTypes,
  evaluateInspection,
  inspectionChecks,
  inspectionReadings,
  reportedCheckIds,
  usageSources,
  type CheckGate,
  type CheckResult,
  type DamageLiability,
  type DamageType,
  type InspectionRecord,
  type UsageSource,
} from '@/domain/inspection';
import { invoiceAmounts } from '@/domain/lease-billing';
import { formatEuro } from '@/domain/money';
import { getT, type MessageKey } from '@/i18n/get-t';
import { intlLocale, type Locale } from '@/i18n/locales';
import type { RecoveryInspection } from '@/server/recovery-input';

export const inputClass =
  'mt-2 min-h-target w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-body';
export const primaryButtonClass =
  'pressable min-h-target rounded-pill bg-primary px-6 py-3 text-caption font-semibold text-white disabled:opacity-50';

const groups: readonly { id: string; gates: readonly CheckGate[] }[] = [
  { id: 'identity', gates: ['identity', 'condition'] },
  { id: 'safety', gates: ['structural', 'safety'] },
  { id: 'function', gates: ['function'] },
];

type CheckState = { result: CheckResult | ''; repair: string; note: string };
type DamageState = { area: string; type: DamageType; liability: DamageLiability; repair: string };

type Props = {
  locale: Locale;
  category: AssetCategory;
  reportedIssues: readonly string[];
  reportedCondition: AssetCondition | null;
  reportedUsage: number | null;
  inspection: RecoveryInspection | null;
  currentUsage: number;
  recordedAge: number | null;
  defaultAge: number;
  vatBasisPoints: number;
  busy: boolean;
  failed: boolean;
  onSubmit: (body: unknown) => void;
};

export function InspectionForm({
  locale,
  category,
  reportedIssues,
  reportedCondition,
  reportedUsage,
  inspection,
  currentUsage,
  recordedAge,
  defaultAge,
  vatBasisPoints,
  busy,
  failed,
  onSubmit,
}: Props) {
  const t = getT(locale);
  const saved = inspection?.record;
  const money = (net: number) => (invoiceAmounts(net, vatBasisPoints).totalCents / 100).toFixed(2);
  const definitions = inspectionChecks(category);
  const readingDefinitions = inspectionReadings(category);
  const reported = new Set(reportedCheckIds(category, reportedIssues));

  const [usageSource, setUsageSource] = useState<UsageSource>(saved?.usageSource ?? 'display');
  const [customerPresent, setCustomerPresent] = useState(saved?.customerPresent ?? false);
  const [checks, setChecks] = useState<Record<string, CheckState>>(() =>
    Object.fromEntries(
      definitions.map(({ id }) => {
        const check = saved?.checks.find((item) => item.id === id);
        return [
          id,
          {
            result: check?.result ?? '',
            repair: check?.repairCents ? money(check.repairCents) : '',
            note: check?.note ?? '',
          },
        ];
      })
    )
  );
  const [readings, setReadings] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      readingDefinitions.map(({ id }) => {
        const value = saved?.readings.find((item) => item.id === id)?.value;
        return [id, value === undefined || value === null ? '' : String(value)];
      })
    )
  );
  const [damage, setDamage] = useState<DamageState[]>(() =>
    (saved?.damage ?? []).map((entry) => ({
      area: entry.area,
      type: entry.type,
      liability: entry.liability,
      repair: entry.repairCents ? money(entry.repairCents) : '',
    }))
  );
  const [condition, setCondition] = useState<AssetCondition>(
    inspection?.condition ?? reportedCondition ?? 'good'
  );
  const [targetCondition, setTargetCondition] = useState<'good' | 'like_new'>(
    inspection?.targetCondition ?? 'good'
  );

  /** A blank amount means no cost; anything unreadable makes the record invalid. */
  function netCents(text: string): number {
    if (!text.trim()) return 0;
    const gross = parseEuroCents(text);
    return gross === null ? -1 : netFromGross(gross, vatBasisPoints);
  }
  const record: InspectionRecord = {
    usageSource,
    customerPresent,
    checks: definitions.flatMap(({ id }) => {
      const check = checks[id]!;
      return check.result
        ? [
            {
              id,
              result: check.result,
              // Costs entered before changing a result away from repair no longer apply.
              repairCents: check.result === 'repair' ? netCents(check.repair) : 0,
              note: check.note.trim(),
            },
          ]
        : [];
    }),
    readings: readingDefinitions.map(({ id }) => {
      const text = readings[id]!.trim();
      return { id, value: text === '' ? null : Number(text.replace(',', '.')) };
    }),
    damage: damage.map((entry) => ({
      area: entry.area.trim(),
      type: entry.type,
      liability: entry.liability,
      repairCents: netCents(entry.repair),
    })),
  };
  const findings = evaluateInspection(category, record);
  const allowed = conditionsUpTo(findings.conditionCap);
  // The grade follows the findings down automatically, and never silently back up.
  const grade = allowed.includes(condition) ? condition : findings.conditionCap;
  const currency = (net: number) =>
    formatEuro(invoiceAmounts(Math.max(0, net), vatBasisPoints).totalCents, intlLocale[locale]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({
      action: 'assess',
      condition: grade,
      targetCondition,
      usageValue: Number(data.get('usageValue')),
      ageMonths: Number(data.get('ageMonths')),
      notes: data.get('notes'),
      record,
    });
  }
  const setCheck = (id: string, change: Partial<CheckState>) =>
    setChecks((current) => ({ ...current, [id]: { ...current[id]!, ...change } }));
  const setDamageRow = (index: number, change: Partial<DamageState>) =>
    setDamage((current) =>
      current.map((entry, position) => (position === index ? { ...entry, ...change } : entry))
    );
  const answered = definitions.length - findings.missingChecks.length;

  return (
    <form onSubmit={submit} className="rounded-lg border border-hairline p-6">
      <h2 className="text-tagline font-semibold">{t('recovery.inspection')}</h2>
      <p className="mt-3 text-caption text-ink-muted">{t('recovery.inspectionIntro')}</p>
      <fieldset disabled={busy} className="mt-6 space-y-8">
        <section>
          <h3 className="text-caption font-semibold">{t('inspection.section.item')}</h3>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            <label className="text-caption">
              {t(`product.usage.${category}`)}
              <input
                name="usageValue"
                type="number"
                min={currentUsage}
                max={100000000}
                step={1}
                defaultValue={inspection?.usageValue ?? Math.max(currentUsage, reportedUsage ?? 0)}
                required
                className={inputClass}
              />
            </label>
            <label className="text-caption">
              {t('inspection.usageSource')}
              <select
                value={usageSource}
                onChange={(event) => setUsageSource(event.target.value as UsageSource)}
                className={inputClass}
              >
                {usageSources.map((source) => (
                  <option key={source} value={source}>
                    {t(`inspection.usageSource.${source}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-caption">
              {t('recovery.ageMonths')}
              <input
                name="ageMonths"
                type="number"
                min={0}
                max={1200}
                step={1}
                readOnly={recordedAge !== null}
                defaultValue={recordedAge ?? inspection?.ageMonths ?? defaultAge}
                required
                className={inputClass}
              />
            </label>
            <label className="flex min-h-target items-center gap-3 self-end text-caption">
              <input
                type="checkbox"
                checked={customerPresent}
                onChange={(event) => setCustomerPresent(event.target.checked)}
                className="size-4 shrink-0 accent-primary"
              />
              {t('inspection.customerPresent')}
            </label>
          </div>
        </section>

        {groups.map((group) => (
          <section key={group.id}>
            <h3 className="text-caption font-semibold">
              {t(`inspection.section.${group.id}` as MessageKey)}
            </h3>
            <ul className="mt-2 divide-y divide-divider">
              {definitions
                .filter((definition) => group.gates.includes(definition.gate))
                .map(({ id, gate }) => {
                  const check = checks[id]!;
                  return (
                    <li key={id} className="py-4">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-start">
                        <div>
                          <label htmlFor={`check-${id}`} className="text-body font-semibold">
                            {t(`inspection.check.${id}` as MessageKey)}
                          </label>
                          <p className="mt-1 text-caption text-ink-muted">
                            {t(`inspection.hint.${id}` as MessageKey)}
                          </p>
                          {reported.has(id) ? (
                            <p className="mt-1 text-caption font-semibold">
                              ● {t('inspection.reported')}
                            </p>
                          ) : null}
                        </div>
                        <select
                          id={`check-${id}`}
                          required
                          value={check.result}
                          onChange={(event) =>
                            setCheck(id, { result: event.target.value as CheckResult })
                          }
                          className="min-h-target w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-caption"
                        >
                          <option value="">{t('inspection.choose')}</option>
                          {checkResults
                            .filter(
                              (result) =>
                                gate !== 'identity' || !['wear', 'not_applicable'].includes(result)
                            )
                            .map((result) => (
                              <option key={result} value={result}>
                                {t(`inspection.result.${result}`)}
                              </option>
                            ))}
                        </select>
                      </div>
                      {check.result === 'repair' ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                          <label className="text-caption">
                            {t('inspection.repairCost')}
                            <input
                              inputMode="decimal"
                              value={check.repair}
                              onChange={(event) => setCheck(id, { repair: event.target.value })}
                              className={inputClass}
                            />
                          </label>
                          <label className="text-caption">
                            {t('inspection.repairNote')}
                            <input
                              maxLength={300}
                              value={check.note}
                              onChange={(event) => setCheck(id, { note: event.target.value })}
                              className={inputClass}
                            />
                          </label>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}

        <section>
          <h3 className="text-caption font-semibold">{t('inspection.section.readings')}</h3>
          <p className="mt-1 text-caption text-ink-muted">{t('inspection.readingsHint')}</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-3">
            {readingDefinitions.map(({ id, unit, max }) => (
              <label key={id} className="text-caption">
                {t(`inspection.reading.${id}` as MessageKey)} ({t(`inspection.unit.${unit}`)})
                <input
                  type="number"
                  min={0}
                  max={max}
                  step="any"
                  value={readings[id]}
                  onChange={(event) =>
                    setReadings((current) => ({ ...current, [id]: event.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          {batteryBelowBenchmark(record.readings) ? (
            <p className="mt-3 rounded-sm bg-parchment p-3 text-caption">
              {t('inspection.batteryLow')}
            </p>
          ) : null}
        </section>

        <section>
          <h3 className="text-caption font-semibold">{t('inspection.section.damage')}</h3>
          <p className="mt-1 text-caption text-ink-muted">{t('inspection.damageHint')}</p>
          <ul className="mt-3 space-y-4">
            {damage.map((entry, index) => (
              <li key={index} className="rounded-sm bg-parchment p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-caption sm:col-span-2">
                    {t('inspection.damageArea')}
                    <input
                      required
                      maxLength={80}
                      value={entry.area}
                      onChange={(event) => setDamageRow(index, { area: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-caption">
                    {t('inspection.damageType')}
                    <select
                      value={entry.type}
                      onChange={(event) =>
                        setDamageRow(index, { type: event.target.value as DamageType })
                      }
                      className={inputClass}
                    >
                      {damageTypes.map((type) => (
                        <option key={type} value={type}>
                          {t(`inspection.damage.${type}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-caption">
                    {t('inspection.damageLiability')}
                    <select
                      value={entry.liability}
                      onChange={(event) =>
                        setDamageRow(index, { liability: event.target.value as DamageLiability })
                      }
                      className={inputClass}
                    >
                      {damageLiabilities.map((liability) => (
                        <option key={liability} value={liability}>
                          {t(`inspection.liability.${liability}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-caption">
                    {t('inspection.repairCost')}
                    <input
                      inputMode="decimal"
                      value={entry.repair}
                      onChange={(event) => setDamageRow(index, { repair: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() =>
                        setDamage((current) => current.filter((_, position) => position !== index))
                      }
                      className="min-h-target text-caption text-primary underline"
                    >
                      {t('inspection.damageRemove')}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {damage.length < 12 ? (
            <button
              type="button"
              onClick={() =>
                setDamage((current) => [
                  ...current,
                  { area: '', type: 'scratch', liability: 'fair_wear', repair: '' },
                ])
              }
              className="mt-3 min-h-target rounded-pill border border-primary px-5 py-2 text-caption text-primary"
            >
              {t('inspection.damageAdd')}
            </button>
          ) : null}
        </section>

        <section className="rounded-sm bg-parchment p-4">
          <h3 className="text-caption font-semibold">{t('inspection.section.result')}</h3>
          <dl className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-caption text-ink-muted">{t('inspection.progress')}</dt>
              <dd className="mt-1 font-semibold">
                {t('inspection.progressValue', {
                  answered,
                  total: definitions.length,
                })}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ink-muted">{t('inspection.totalRepairs')}</dt>
              <dd className="mt-1 font-semibold">{currency(findings.repairNetCents)}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-muted">{t('inspection.totalChargeable')}</dt>
              <dd className="mt-1 font-semibold">{currency(findings.chargeableNetCents)}</dd>
            </div>
          </dl>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="text-caption">
              {t('recovery.currentCondition')}
              <select
                value={grade}
                onChange={(event) => setCondition(event.target.value as AssetCondition)}
                className={inputClass}
              >
                {allowed.map((value) => (
                  <option key={value} value={value}>
                    {t(`condition.${value}`)}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-fine text-ink-muted">
                {t('inspection.capNote', { condition: t(`condition.${findings.conditionCap}`) })}
              </span>
            </label>
            <label className="text-caption">
              {t('recovery.targetCondition')}
              <select
                value={targetCondition}
                onChange={(event) => setTargetCondition(event.target.value as 'good' | 'like_new')}
                className={inputClass}
              >
                {(['good', 'like_new'] as const).map((value) => (
                  <option key={value} value={value}>
                    {t(`condition.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-caption sm:col-span-2">
              {t('recovery.notes')}
              <textarea
                name="notes"
                required
                minLength={1}
                maxLength={1000}
                defaultValue={inspection?.notes ?? ''}
                rows={3}
                className={inputClass}
              />
            </label>
          </div>
          {failed ? (
            <p role="alert" className="mt-4 text-caption font-semibold">
              {t('recovery.error')}
            </p>
          ) : null}
          <button type="submit" className={`${primaryButtonClass} mt-5 w-full`}>
            {t(busy ? 'auth.working' : 'recovery.calculate')}
          </button>
        </section>
      </fieldset>
    </form>
  );
}
