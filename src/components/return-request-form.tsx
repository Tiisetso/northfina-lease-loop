'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { AssetCategory, AssetCondition } from '@/data/schemas';
import { getT, type MessageKey } from '@/i18n/get-t';
import type { Locale } from '@/i18n/locales';

const issues: Record<AssetCategory, readonly string[]> = {
  laptop: [
    'cosmetic_scratches',
    'dents',
    'screen_damage',
    'keyboard_fault',
    'battery_weak',
    'missing_accessories',
    'not_working',
  ],
  e_bike: [
    'cosmetic_scratches',
    'dents',
    'brakes_fault',
    'tyres_worn',
    'drive_fault',
    'battery_weak',
    'missing_accessories',
    'not_working',
  ],
  farm_machine: [
    'cosmetic_scratches',
    'dents',
    'engine_fault',
    'hydraulic_fault',
    'service_due',
    'missing_accessories',
    'not_working',
  ],
};

export function ReturnRequestForm({
  locale,
  contractId,
  category,
  condition,
  usageValue,
  usageUnit,
  today,
}: {
  locale: Locale;
  contractId: string;
  category: AssetCategory;
  condition: AssetCondition;
  usageValue: number;
  usageUnit: string;
  today: string;
}) {
  const t = getT(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const field = 'mt-2 min-h-target w-full rounded-sm border border-hairline bg-canvas px-4 py-3';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(`/api/leases/${encodeURIComponent(contractId)}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'return',
          report: {
            condition: form.get('condition'),
            usageValue: Number(form.get('usageValue')),
            issues: form.getAll('issues'),
            notes: form.get('notes'),
            preferredDate: form.get('preferredDate'),
          },
        }),
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      router.push(`/${locale}/account/leases/${encodeURIComponent(contractId)}`);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-7" aria-busy={busy}>
      <fieldset disabled={busy} className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="return-condition" className="text-caption font-semibold">
              {t('return.reportedCondition')}
            </label>
            <select
              id="return-condition"
              name="condition"
              defaultValue={condition === 'new' ? 'like_new' : condition}
              className={field}
            >
              {(['like_new', 'good', 'fair', 'poor'] as const).map((value) => (
                <option key={value} value={value}>
                  {t(`condition.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="return-usage" className="text-caption font-semibold">
              {t('return.usage', { unit: t(`return.unit.${usageUnit}` as MessageKey) })}
            </label>
            <input
              id="return-usage"
              name="usageValue"
              type="number"
              min={usageValue}
              step={1}
              defaultValue={usageValue}
              required
              className={field}
            />
            <p className="mt-2 text-fine text-ink-muted">{t('return.usageHint')}</p>
          </div>
        </div>
        <fieldset>
          <legend className="text-caption font-semibold">{t('return.issues')}</legend>
          <p className="mt-2 text-caption text-ink-muted">{t('return.issuesHint')}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {issues[category].map((issue) => (
              <label
                key={issue}
                className="flex min-h-target cursor-pointer items-center gap-3 rounded-sm border border-hairline px-3 py-2 text-caption has-checked:border-primary has-checked:bg-primary/5"
              >
                <input
                  type="checkbox"
                  name="issues"
                  value={issue}
                  className="size-4 accent-primary"
                />
                {t(`return.issue.${issue}` as MessageKey)}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="return-date" className="text-caption font-semibold">
            {t('return.preferredDate')}
          </label>
          <input
            id="return-date"
            name="preferredDate"
            type="date"
            min={today}
            defaultValue={today}
            required
            className={field}
          />
        </div>
        <div>
          <label htmlFor="return-notes" className="text-caption font-semibold">
            {t('return.notes')}
          </label>
          <textarea id="return-notes" name="notes" rows={3} maxLength={1000} className={field} />
        </div>
        <p className="rounded-sm bg-parchment p-4 text-caption text-ink-muted">
          {t('return.reviewNote')}
        </p>
        {error ? (
          <p role="alert" className="text-caption">
            {t('return.submitError')}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="pressable inline-flex min-h-target items-center justify-center rounded-pill bg-primary px-6 py-3 text-caption font-semibold text-white disabled:opacity-50"
        >
          {t(busy ? 'auth.working' : 'return.submit')}
        </button>
      </fieldset>
    </form>
  );
}
