'use client';

import { useState, type FormEvent } from 'react';
import type { AssetCategory } from '@/data/schemas';
import {
  requiredSignoff,
  sanitizationMethods,
  signoffGaps,
  type InspectionRecord,
  type SanitizationMethod,
} from '@/domain/inspection';
import { getT, type MessageKey } from '@/i18n/get-t';
import type { Locale } from '@/i18n/locales';
import { inputClass, primaryButtonClass } from './inspection-form';

const wipeFields = ['storageModel', 'storageSerial', 'technique', 'tool', 'verification'] as const;
type WipeField = (typeof wipeFields)[number];

/** Confirms the planned work happened. This makes the item ready; it does not publish anything. */
export function RefurbishmentSignoff({
  locale,
  category,
  workItems,
  record,
  busy,
  failed,
  onSubmit,
}: {
  locale: Locale;
  category: AssetCategory;
  workItems: readonly { id: string }[];
  record: InspectionRecord | undefined;
  busy: boolean;
  failed: boolean;
  onSubmit: (body: unknown) => void;
}) {
  const t = getT(locale);
  const required = requiredSignoff(category, workItems, record);
  const [completed, setCompleted] = useState<string[]>([]);
  const [retested, setRetested] = useState<string[]>([]);
  const [method, setMethod] = useState<SanitizationMethod>('purge');
  const [wipe, setWipe] = useState<Record<WipeField, string>>({
    storageModel: '',
    storageSerial: '',
    technique: '',
    tool: '',
    verification: '',
  });
  const [notes, setNotes] = useState('');
  const work = {
    completedWork: completed,
    retestedChecks: retested,
    sanitization: required.sanitization ? { ...wipe, method } : null,
    notes,
  };
  const gaps = signoffGaps(required, work);

  const toggle = (list: string[], id: string, on: boolean) =>
    on ? [...list, id] : list.filter((item) => item !== id);
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ action: 'complete_work', work });
  }
  const noteFor = (id: string) => record?.checks.find((check) => check.id === id)?.note;

  return (
    <form onSubmit={submit} className="rounded-lg border border-hairline p-6">
      <h2 className="text-tagline font-semibold">{t('signoff.title')}</h2>
      <p className="mt-3 text-caption text-ink-muted">{t('signoff.intro')}</p>
      <fieldset disabled={busy} className="mt-5 space-y-6">
        {required.work.length ? (
          <section>
            <h3 className="text-caption font-semibold">{t('signoff.work')}</h3>
            <ul className="mt-2 space-y-1">
              {required.work.map((id) => (
                <li key={id}>
                  <label className="flex min-h-target items-center gap-3 text-caption">
                    <input
                      type="checkbox"
                      checked={completed.includes(id)}
                      onChange={(event) =>
                        setCompleted((list) => toggle(list, id, event.target.checked))
                      }
                      className="size-4 shrink-0 accent-primary"
                    />
                    {t(`recovery.task.${id}` as MessageKey)}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {required.retests.length ? (
          <section>
            <h3 className="text-caption font-semibold">{t('signoff.retests')}</h3>
            <p className="mt-1 text-caption text-ink-muted">{t('signoff.retestsHint')}</p>
            <ul className="mt-2 space-y-1">
              {required.retests.map((id) => (
                <li key={id}>
                  <label className="flex min-h-target items-center gap-3 text-caption">
                    <input
                      type="checkbox"
                      checked={retested.includes(id)}
                      onChange={(event) =>
                        setRetested((list) => toggle(list, id, event.target.checked))
                      }
                      className="size-4 shrink-0 accent-primary"
                    />
                    <span>
                      {t(`inspection.check.${id}` as MessageKey)}
                      {noteFor(id) ? (
                        <span className="block text-ink-muted">{noteFor(id)}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {required.sanitization ? (
          <section>
            <h3 className="text-caption font-semibold">{t('signoff.wipe')}</h3>
            <p className="mt-1 text-caption text-ink-muted">{t('signoff.wipeHint')}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-caption">
                {t('signoff.wipe.method')}
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as SanitizationMethod)}
                  className={inputClass}
                >
                  {sanitizationMethods.map((option) => (
                    <option key={option} value={option}>
                      {t(`signoff.wipe.method.${option}`)}
                    </option>
                  ))}
                </select>
              </label>
              {wipeFields.map((field) => (
                <label key={field} className="text-caption">
                  {t(`signoff.wipe.${field}`)}
                  <input
                    required
                    maxLength={120}
                    value={wipe[field]}
                    onChange={(event) =>
                      setWipe((current) => ({ ...current, [field]: event.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          </section>
        ) : null}
        <label className="block text-caption">
          {t('signoff.notes')}
          <textarea
            rows={2}
            maxLength={1000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={inputClass}
          />
        </label>
        {failed ? (
          <p role="alert" className="text-caption font-semibold">
            {t('recovery.error')}
          </p>
        ) : null}
        <button type="submit" disabled={!gaps.ok} className={`${primaryButtonClass} w-full`}>
          {t(busy ? 'auth.working' : 'signoff.submit')}
        </button>
        {!gaps.ok ? <p className="text-caption text-ink-muted">{t('signoff.incomplete')}</p> : null}
      </fieldset>
    </form>
  );
}
