import type { AssetCategory } from '@/data/schemas';
import { inspectionReadings, type InspectionRecord } from '@/domain/inspection';
import { formatNumber } from '@/i18n/format';
import { getT, type MessageKey } from '@/i18n/get-t';
import type { Locale } from '@/i18n/locales';

/** The saved findings, for everyone working on the item after the assessment. */
export function InspectionSummary({
  locale,
  category,
  record,
  notes,
  currency,
}: {
  locale: Locale;
  category: AssetCategory;
  record: InspectionRecord;
  notes: string;
  /** Formats a net amount the way the rest of the page shows it. */
  currency: (netCents: number) => string;
}) {
  const t = getT(locale);
  const findings = record.checks.filter((check) =>
    ['repair', 'wear', 'not_tested'].includes(check.result)
  );
  const units = new Map(inspectionReadings(category).map((item) => [item.id, item.unit]));
  const unitOf = (id: string) => units.get(id) ?? 'count';
  const readings = record.readings.filter((reading) => reading.value !== null);
  return (
    <section className="rounded-lg border border-hairline p-6">
      <h2 className="text-tagline font-semibold">{t('inspection.summary')}</h2>
      <p className="mt-3 whitespace-pre-wrap text-body">{notes}</p>
      <p className="mt-3 text-caption text-ink-muted">
        {t(`inspection.usageSource.${record.usageSource}`)}
        {record.customerPresent ? ` · ${t('inspection.customerPresent')}` : ''}
      </p>
      {findings.length ? (
        <ul className="mt-5 divide-y divide-divider">
          {findings.map((check) => (
            <li key={check.id} className="flex justify-between gap-4 py-3 text-caption">
              <span>
                <strong className="font-semibold">
                  {t(`inspection.check.${check.id}` as MessageKey)}
                </strong>{' '}
                · {t(`inspection.result.${check.result}`)}
                {check.note ? <span className="block text-ink-muted">{check.note}</span> : null}
              </span>
              {check.repairCents ? (
                <strong className="shrink-0">{currency(check.repairCents)}</strong>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-caption">{t('inspection.noFindings')}</p>
      )}
      {readings.length ? (
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          {readings.map((reading) => (
            <div key={reading.id}>
              <dt className="text-caption text-ink-muted">
                {t(`inspection.reading.${reading.id}` as MessageKey)}
              </dt>
              <dd className="mt-1 font-semibold">
                {formatNumber(reading.value!, locale)}
                {unitOf(reading.id) === 'count'
                  ? ''
                  : ` ${t(`inspection.unit.${unitOf(reading.id)}`)}`}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {record.damage.length ? (
        <>
          <h3 className="mt-5 text-caption font-semibold">{t('inspection.section.damage')}</h3>
          <ul className="mt-2 divide-y divide-divider">
            {record.damage.map((entry, index) => (
              <li key={index} className="flex justify-between gap-4 py-3 text-caption">
                <span>
                  {entry.area} · {t(`inspection.damage.${entry.type}`)} ·{' '}
                  {t(`inspection.liability.${entry.liability}`)}
                </span>
                {entry.repairCents ? (
                  <strong className="shrink-0">{currency(entry.repairCents)}</strong>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
