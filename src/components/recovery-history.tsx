import { invoiceAmounts } from '@/domain/lease-billing';
import { formatEuro } from '@/domain/money';
import { formatIsoDate } from '@/i18n/format';
import { getT, type MessageKey } from '@/i18n/get-t';
import { intlLocale, type Locale } from '@/i18n/locales';
import { db } from '@/server/db';
import { recoveryCalculationSchema } from '@/server/recovery-input';

/** Only public work and valuation facts; no prior customer's identity or report. */
export async function RecoveryHistory({
  assetId,
  locale,
  vatBasisPoints,
}: {
  assetId: string;
  locale: Locale;
  vatBasisPoints: number;
}) {
  const assessment = await db.returnAssessment.findFirst({
    where: { status: 'published', request: { contract: { assetId } } },
    orderBy: { updatedAt: 'desc' },
    select: { calculationJson: true, updatedAt: true },
  });
  if (!assessment) return null;
  const calculation = recoveryCalculationSchema.parse(JSON.parse(assessment.calculationJson));
  const t = getT(locale);
  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-10 sm:px-6">
      <div className="rounded-lg border border-hairline p-6">
        <p className="text-caption font-semibold text-primary">{t('recovery.secondLife')}</p>
        <h2 className="mt-2 text-tagline font-semibold">{t('recovery.history')}</h2>
        <p className="mt-3 text-caption text-ink-muted">
          {t('recovery.historyIntro')} ·{' '}
          {formatIsoDate(assessment.updatedAt.toISOString().slice(0, 10), locale)}
        </p>
        <ul className="mt-5 flex flex-wrap gap-3">
          {calculation.recovery.workItems.map((work) => (
            <li key={work.id} className="rounded-pill bg-parchment px-4 py-2 text-caption">
              ✓ {t(`recovery.task.${work.id}` as MessageKey)}
            </li>
          ))}
        </ul>
        <details className="mt-5">
          <summary className="cursor-pointer text-caption text-primary">
            {t('return.calculation')}
          </summary>
          <dl className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-caption text-ink-muted">{t('recovery.nextPrice')}</dt>
              <dd className="mt-1 font-semibold">
                {formatEuro(
                  invoiceAmounts(calculation.recovery.postRepairValueCents, vatBasisPoints)
                    .totalCents,
                  intlLocale[locale]
                )}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ink-muted">{t('recovery.refurbCost')}</dt>
              <dd className="mt-1 font-semibold">
                {formatEuro(
                  invoiceAmounts(calculation.recovery.refurbishmentCostCents, vatBasisPoints)
                    .totalCents,
                  intlLocale[locale]
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-caption text-ink-muted">{t('pricing.includesVat')}</p>
        </details>
      </div>
    </section>
  );
}
