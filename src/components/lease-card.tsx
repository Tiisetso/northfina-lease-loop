import Link from 'next/link';
import type { VatRate } from '@/data/schemas';
import { sharesOn } from '@/domain/co-lease';
import { invoiceAmounts } from '@/domain/lease-billing';
import { summarizeLease } from '@/domain/lease-dashboard';
import { formatEuro } from '@/domain/money';
import { formatIsoDate } from '@/i18n/format';
import { getT } from '@/i18n/get-t';
import { intlLocale, type Locale } from '@/i18n/locales';
import type { CustomerLease } from '@/server/leases';
import { AvatarStack } from './person-avatar';
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
  const rate = rates.find(
    (item) => item.valid_from <= today && (item.valid_to === null || item.valid_to >= today)
  );
  const monthly = rate
    ? invoiceAmounts(lease.monthlyNetCents, Math.round(rate.rate_percent * 100)).totalCents
    : null;
  const money = (cents: number) => formatEuro(cents, intlLocale[locale]);
  const people = sharesOn(lease.coLeaseShares, today);
  return (
    <article className="h-full rounded-lg border border-hairline bg-canvas p-5">
      <div className="flex items-start gap-4">
        <div className="w-24 shrink-0 sm:w-28">
          <ProductPhoto
            assetId={lease.asset.id}
            productName={`${lease.asset.make} ${lease.asset.model}`}
            locale={locale}
            showCaption={false}
            sizes="112px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-fine font-semibold ${lease.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-parchment text-ink-muted'}`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${lease.status === 'active' ? 'bg-emerald-600' : 'bg-ink-muted'}`}
            />
            {t(`dashboard.status.${lease.status}`)}
          </span>
          <h3 className="mt-2 text-body font-semibold wrap-anywhere">
            {lease.asset.make} {lease.asset.model}
          </h3>
          <p className="mt-2 text-body font-semibold tabular-nums">
            {monthly === null
              ? t('dashboard.forecastUnavailable')
              : `${money(monthly)} / ${t('dashboard.month')}`}
          </p>
          <p className="text-fine text-ink-muted">{t('dashboard.includesVat')}</p>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-divider pt-4 text-caption">
        <div>
          <dt className="text-ink-muted">{t('dashboard.nextPayment')}</dt>
          <dd className="mt-1 font-semibold">
            {lease.status === 'active' && info.next
              ? money(info.next.shareCents)
              : t('dashboard.noNext')}
          </dd>
          {lease.status === 'active' && info.next ? (
            <dd className="mt-1 text-fine text-ink-muted">
              {formatIsoDate(info.next.dueDate, locale)}
              {info.next.kind === 'issued' ? ` · ${t('dashboard.issued')}` : ''}
            </dd>
          ) : null}
        </div>
        <div>
          <dt className="text-ink-muted">{t('dashboard.ends')}</dt>
          <dd className="mt-1 font-semibold">{formatIsoDate(info.endDate, locale)}</dd>
          <dd className="mt-1 text-fine text-ink-muted">
            {t('dashboard.monthsProgress', {
              completed: info.elapsedMonths,
              total: lease.termMonths,
            })}
          </dd>
        </div>
      </dl>
      {people.length > 1 ? (
        <div className="mt-4 flex items-center gap-3 border-t border-divider pt-4">
          <AvatarStack people={people.map(({ user }) => user)} />
          <p className="text-caption text-ink-muted">
            {t('colease.cardNote', { count: people.length })}
          </p>
        </div>
      ) : null}
      <Link
        className="mt-3 inline-flex min-h-target items-center gap-2 text-caption font-semibold text-primary"
        href={`/${locale}/account/leases/${encodeURIComponent(lease.id)}`}
      >
        {t('dashboard.viewLease')} <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
