'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { AssetCategory } from '@/data/schemas';
import { parseEuroCents } from '@/domain/application-fields';
import { netFromGross } from '@/domain/gross-money';
import { invoiceAmounts } from '@/domain/lease-billing';
import { formatEuro } from '@/domain/money';
import { getT, type MessageKey } from '@/i18n/get-t';
import { intlLocale, type Locale } from '@/i18n/locales';
import type {
  RecoveryCalculation,
  RecoveryInspection,
  RecoveryReport,
} from '@/server/recovery-input';

type Props = {
  locale: Locale;
  requestId: string;
  category: AssetCategory;
  report: RecoveryReport | null;
  inspection: RecoveryInspection | null;
  calculation: RecoveryCalculation | null;
  status: string;
  currentUsage: number;
  recordedAge: number | null;
  defaultAge: number;
  vatBasisPoints: number;
};
const inputClass =
  'mt-2 min-h-target w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-body';
const buttonClass =
  'pressable min-h-target rounded-pill bg-primary px-6 py-3 text-caption font-semibold text-white disabled:opacity-50';

export function RecoveryWorkbench({
  locale,
  requestId,
  category,
  report,
  inspection,
  calculation,
  status,
  currentUsage,
  recordedAge,
  defaultAge,
  vatBasisPoints,
}: Props) {
  const t = getT(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const currency = (cents: number) => formatEuro(cents, intlLocale[locale]);
  const gross = (cents: number) =>
    invoiceAmounts(Math.max(0, cents), calculation?.vatBasisPoints ?? vatBasisPoints).totalCents;
  async function send(body: unknown) {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(`/api/staff/returns/${encodeURIComponent(requestId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  function assess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const repairGross = parseEuroCents(String(data.get('repairs') ?? '0'));
    if (repairGross === null) {
      setError(true);
      return;
    }
    void send({
      action: 'assess',
      condition: data.get('condition'),
      targetCondition: data.get('targetCondition'),
      usageValue: Number(data.get('usageValue')),
      ageMonths: Number(data.get('ageMonths')),
      additionalRepairCents: netFromGross(repairGross, vatBasisPoints),
      notes: data.get('notes'),
    });
  }
  const canAssess = status === 'pending' || status === 'quoted';
  return (
    <div className="mt-8 grid items-start gap-8 desktop:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="space-y-8">
        <section className="rounded-lg bg-parchment p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-tagline font-semibold">{t('recovery.report')}</h2>
            <span className="rounded-pill bg-canvas px-3 py-1 text-caption">
              {t(`recovery.state.${status}` as MessageKey)}
            </span>
          </div>
          {report ? (
            <>
              <dl className="mt-5 grid grid-cols-2 gap-4">
                <Fact label={t('condition.label')} value={t(`condition.${report.condition}`)} />
                <Fact label={t(`product.usage.${category}`)} value={String(report.usageValue)} />
              </dl>
              <ul className="mt-5 space-y-2 text-caption">
                {report.issues.map((issue) => (
                  <li key={issue}>• {t(`return.issue.${issue}` as MessageKey)}</li>
                ))}
              </ul>
              {report.notes ? (
                <p className="mt-5 whitespace-pre-wrap text-body">{report.notes}</p>
              ) : null}
              {report.preferredDate ? (
                <p className="mt-3 text-caption">
                  {t('return.preferredDate')}: {report.preferredDate}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-4 text-caption text-ink-muted">{t('recovery.noReport')}</p>
          )}
        </section>
        {canAssess ? (
          <form onSubmit={assess} className="rounded-lg border border-hairline p-6">
            <h2 className="text-tagline font-semibold">{t('recovery.inspection')}</h2>
            <p className="mt-3 text-caption text-ink-muted">{t('recovery.inspectionIntro')}</p>
            <fieldset disabled={busy} className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-caption">
                {t('recovery.currentCondition')}
                <select
                  name="condition"
                  defaultValue={inspection?.condition ?? report?.condition ?? 'good'}
                  className={inputClass}
                >
                  {(['new', 'like_new', 'good', 'fair', 'poor'] as const).map((value) => (
                    <option key={value} value={value}>
                      {t(`condition.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-caption">
                {t('recovery.targetCondition')}
                <select
                  name="targetCondition"
                  defaultValue={inspection?.targetCondition ?? 'good'}
                  className={inputClass}
                >
                  {(['good', 'like_new'] as const).map((value) => (
                    <option key={value} value={value}>
                      {t(`condition.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-caption">
                {t(`product.usage.${category}`)}
                <input
                  name="usageValue"
                  type="number"
                  min={currentUsage}
                  max={100000000}
                  step={1}
                  defaultValue={
                    inspection?.usageValue ?? Math.max(currentUsage, report?.usageValue ?? 0)
                  }
                  required
                  className={inputClass}
                />
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
              <label className="text-caption sm:col-span-2">
                {t('recovery.additionalRepairs')}
                <input
                  name="repairs"
                  inputMode="decimal"
                  defaultValue={
                    inspection ? (gross(inspection.additionalRepairCents) / 100).toFixed(2) : '0.00'
                  }
                  required
                  className={inputClass}
                />
                <span className="mt-2 block text-fine text-ink-muted">
                  {t('recovery.repairNote')}
                </span>
              </label>
              <label className="text-caption sm:col-span-2">
                {t('recovery.notes')}
                <textarea
                  name="notes"
                  required
                  minLength={1}
                  maxLength={1000}
                  defaultValue={inspection?.notes ?? ''}
                  rows={4}
                  className={inputClass}
                />
              </label>
              <button type="submit" className={`${buttonClass} sm:col-span-2`}>
                {t(busy ? 'auth.working' : 'recovery.calculate')}
              </button>
            </fieldset>
          </form>
        ) : null}
        {calculation ? (
          <section className="rounded-lg border border-hairline p-6">
            <h2 className="text-tagline font-semibold">{t('recovery.work')}</h2>
            <ul className="mt-5 divide-y divide-divider">
              {calculation.recovery.workItems.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3 text-caption">
                  <span>{t(`recovery.task.${item.id}` as MessageKey)}</span>
                  <strong className="shrink-0">{currency(gross(item.costCents))}</strong>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-caption text-ink-muted">{t('pricing.includesVat')}</p>
          </section>
        ) : null}
      </div>
      <aside className="rounded-lg bg-parchment p-6">
        <h2 className="text-tagline font-semibold">{t('recovery.numbers')}</h2>
        {calculation ? (
          <>
            <p className="mt-5 text-caption text-ink-muted">{t('recovery.nextPrice')}</p>
            <p className="mt-2 font-display text-display-lg font-semibold">
              {currency(gross(calculation.recovery.postRepairValueCents))}
            </p>
            <p className="mt-1 text-caption text-ink-muted">{t('pricing.includesVat')}</p>
            <dl className="mt-6 space-y-5">
              <Fact
                label={t('recovery.originalPrice')}
                value={currency(gross(calculation.originalPriceCents))}
              />
              <Fact label={t('recovery.ageMonths')} value={String(calculation.ageMonths)} />
              <Fact
                label={t('recovery.returnedValue')}
                value={currency(gross(calculation.recovery.asReturnedValueCents))}
              />
              <Fact
                label={t('recovery.refurbCost')}
                value={currency(gross(calculation.recovery.refurbishmentCostCents))}
              />
              <Fact
                label={t('recovery.returnSettlement')}
                value={currency(calculation.settlement.returnTotalCents)}
              />
              <Fact
                label={t('recovery.buyoutQuote')}
                value={currency(calculation.settlement.buyoutTotalCents)}
              />
            </dl>
            <p className="mt-5 text-caption text-ink-muted">{t('recovery.quoteNote')}</p>
            {status === 'quoted' ? (
              <p className="mt-5 rounded-sm bg-canvas p-4 text-caption">
                {t('recovery.awaitCustomer')}
              </p>
            ) : null}
            {status === 'accepted' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void send({ action: 'receive' })}
                className={`${buttonClass} mt-6 w-full`}
              >
                {t('recovery.receive')}
              </button>
            ) : null}
            {status === 'received' ? (
              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send({ action: 'publish', workCompleted: true });
                }}
              >
                <label className="flex items-start gap-3 text-caption">
                  <input type="checkbox" required className="mt-1 size-4 shrink-0 accent-primary" />
                  {t('recovery.workCompleted')}
                </label>
                <button type="submit" disabled={busy} className={`${buttonClass} w-full`}>
                  {t('recovery.publish')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ action: 'retire' })}
                  className="min-h-target w-full text-caption text-primary underline"
                >
                  {t('recovery.retire')}
                </button>
              </form>
            ) : null}
          </>
        ) : (
          <p className="mt-5 text-body text-ink-muted">{t('recovery.beforeQuote')}</p>
        )}
        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-sm border border-hairline bg-canvas p-4 text-caption"
          >
            {t('recovery.error')}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
