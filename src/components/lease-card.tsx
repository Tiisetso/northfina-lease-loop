import Link from 'next/link';
import type { VatRate } from '@/data/schemas';
import { summarizeLease } from '@/domain/lease-dashboard';
import { formatEuro } from '@/domain/money';
import { formatIsoDate } from '@/i18n/format';
import { getT } from '@/i18n/get-t';
import { intlLocale, type Locale } from '@/i18n/locales';
import type { CustomerLease } from '@/server/leases';
import { ProductPhoto } from './product-photo';

export function LeaseCard({
  lease,
  rates,
  today,
  locale,
}: {
  lease: CustomerLease;
  rates: VatRate[];
  today: string;
  locale: Locale;
}) {
  const t = getT(locale);
  const info = summarizeLease(lease, rates, today);
  return (
    <article className="flex h-full flex-col rounded-lg border border-hairline bg-canvas p-card">
      <div className="mb-6">
        <ProductPhoto
          assetId={lease.asset.id}
          productName={`${lease.asset.make} ${lease.asset.model}`}
          locale={locale}
          showCaption={false}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <p className="text-caption text-ink-muted">{lease.asset.make}</p>
        <span className="rounded-sm bg-parchment px-2 py-1 text-caption">
          {t(`dashboard.status.${lease.status}`)}
        </span>
      </div>
      <h3 className="mt-2 text-tagline font-semibold">{lease.asset.model}</h3>
      <p className="mt-4 text-caption text-ink-muted">{t('dashboard.monthlyNet')}</p>
      <p className="text-body font-semibold">
        {formatEuro(lease.monthlyNetCents, intlLocale[locale])} / {t('dashboard.month')}
      </p>
      <div className="mt-6">
        <div className="flex justify-between gap-3 text-caption">
          <span>{t('dashboard.progress')}</span>
          <span>
            {t('dashboard.monthsProgress', {
              completed: info.elapsedMonths,
              total: lease.termMonths,
            })}
          </span>
        </div>
        <progress
          aria-label={t('dashboard.progress')}
          className="mt-2 h-2 w-full accent-primary"
          value={info.elapsedMonths}
          max={lease.termMonths}
        />
      </div>
      <p className="mt-4 text-caption text-ink-muted">
        {t('dashboard.endsOn', { date: formatIsoDate(info.endDate, locale) })}
      </p>
      <Link
        className="mt-auto inline-flex min-h-target items-center pt-5 text-body text-primary"
        href={`/${locale}/account/leases/${encodeURIComponent(lease.id)}`}
      >
        {t('dashboard.viewLease')} →
      </Link>
    </article>
  );
}
