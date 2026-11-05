import type { Co2Factors, VatRate } from '@/data/schemas';
import { paymentStatus } from '@/domain/lease-billing';
import { paidForInvoice, summarizeLease } from '@/domain/lease-dashboard';
import { reuseEstimate } from '@/domain/lease-insights';
import { formatEuro } from '@/domain/money';
import { formatIsoDate, formatNumber } from '@/i18n/format';
import { getT } from '@/i18n/get-t';
import { intlLocale, type Locale } from '@/i18n/locales';
import type { CustomerLease } from '@/server/leases';
import { LeaseRequestControls } from './lease-controls';
import { ProductPhoto } from './product-photo';

type Props = {
  locale: Locale;
  lease: CustomerLease;
  rates: VatRate[];
  factors: Co2Factors;
  today: string;
};
const card = 'rounded-lg border border-hairline bg-canvas p-card';
export function LeaseDetail({ locale, lease, rates, factors, today }: Props) {
  const t = getT(locale);
  const info = summarizeLease(lease, rates, today);
  const currency = (cents: number) => formatEuro(cents, intlLocale[locale]);
  const pending = lease.requests.some((request) => request.status === 'pending');
  const impact = reuseEstimate(
    lease.asset.category,
    lease.asset.condition,
    lease.asset.previous_lives,
    factors
  );
  const timeline = [
    ...lease.events.map((event) => ({
      id: event.id,
      date: event.eventDate,
      label: t(`dashboard.event.${event.kind}`),
    })),
    ...lease.invoices
      .filter((invoice) => invoice.status === 'issued')
      .map((invoice) => ({
        id: invoice.id,
        date: invoice.issuedDate,
        label: t('dashboard.event.invoice'),
      })),
    ...lease.requests.map((request) => ({
      id: request.id,
      date: request.createdAt.toISOString().slice(0, 10),
      label: t(`dashboard.request.${request.kind}`),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const projectedTotal = info.forecastTotalCents;
  return (
    <div className="mt-6 grid gap-card desktop:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <div className="min-w-0 space-y-6">
        <section className={card}>
          <p className="text-caption text-ink-muted">
            {lease.asset.make} ·{' '}
            {t(lease.isDemo ? 'dashboard.demo' : `dashboard.status.${lease.status}`)}
          </p>
          <h2 className="mt-2 font-display text-display-sm font-semibold">{lease.asset.model}</h2>
          <div className="mt-6">
            <ProductPhoto
              assetId={lease.asset.id}
              productName={`${lease.asset.make} ${lease.asset.model}`}
              locale={locale}
              sizes="(min-width: 1069px) 60vw, 100vw"
            />
          </div>
          {lease.isDemo ? (
            <p className="mt-3 text-caption text-ink-muted">{t('dashboard.demoNotice')}</p>
          ) : null}
          <dl className="mt-8 grid gap-6 grid:grid-cols-3">
            <Fact label={t('dashboard.monthlyNet')} value={currency(lease.monthlyNetCents)} />
            <Fact label={t('dashboard.started')} value={formatIsoDate(lease.startDate, locale)} />
            <Fact label={t('dashboard.ends')} value={formatIsoDate(info.endDate, locale)} />
          </dl>
          <div className="mt-8">
            <div className="flex flex-wrap justify-between gap-2 text-caption">
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
              className="mt-3 h-2 w-full accent-primary"
              value={info.elapsedMonths}
              max={lease.termMonths}
            />
          </div>
        </section>
        <section className={card}>
          <h3 className="text-tagline font-semibold">{t('dashboard.priceBreakdown')}</h3>
          <p className="mt-3 text-body text-ink-muted">{t('dashboard.lockedExplanation')}</p>
          <dl className="mt-6 grid gap-5 grid:grid-cols-2">
            <Fact label={t('dashboard.listPrice')} value={currency(lease.listPriceCents)} />
            <Fact label={t('dashboard.downPayment')} value={currency(lease.downPaymentCents)} />
            <Fact label={t('dashboard.financed')} value={currency(info.financedCents)} />
            <Fact label={t('dashboard.monthlyNet')} value={currency(lease.monthlyNetCents)} />
            <Fact label={t('dashboard.buyoutNet')} value={currency(lease.buyoutCents)} />
            <Fact label={t('dashboard.priceVersion')} value={String(lease.priceListVersion)} />
            {projectedTotal !== null ? (
              <Fact label={t('dashboard.forecastTotal')} value={currency(projectedTotal)} />
            ) : null}
          </dl>
          <p className="mt-6 text-caption text-ink-muted">
            {t(
              projectedTotal === null
                ? 'dashboard.forecastUnavailable'
                : 'dashboard.forecastTotalNote'
            )}
          </p>
        </section>
        <section className={card}>
          <h3 className="text-tagline font-semibold">{t('dashboard.issuedInvoices')}</h3>
          <p className="mt-3 text-body text-ink-muted">{t('dashboard.vatExplanation')}</p>
          {lease.invoices.filter((invoice) => invoice.status === 'issued').length ? (
            <ul className="mt-5 divide-y divide-divider">
              {lease.invoices
                .filter((invoice) => invoice.status === 'issued')
                .map((invoice) => {
                  const total = invoice.netCents + invoice.vatCents;
                  const paid = paidForInvoice(invoice, lease.isDemo);
                  const status = paymentStatus(total, paid, invoice.dueDate, today);
                  return (
                    <li key={invoice.id} className="py-5">
                      <div className="flex flex-wrap justify-between gap-3">
                        <p className="font-semibold">{formatIsoDate(invoice.dueDate, locale)}</p>
                        <p>
                          {currency(total)} · {t(`dashboard.invoiceStatus.${status}`)}
                        </p>
                      </div>
                      <p className="mt-2 text-caption text-ink-muted">
                        {t('dashboard.vatBreakdown', {
                          net: currency(invoice.netCents),
                          rate: formatNumber(invoice.vatBasisPoints / 100, locale),
                          vat: currency(invoice.vatCents),
                        })}
                      </p>
                      <p className="mt-2 text-caption text-ink-muted">
                        {t('dashboard.paidAmount', { amount: currency(paid) })}
                      </p>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <p className="mt-5 text-body text-ink-muted">{t('dashboard.noInvoices')}</p>
          )}
          <details className="mt-5 border-t border-divider pt-5">
            <summary className="cursor-pointer text-body text-primary">
              {t('dashboard.forecastSchedule')}
            </summary>
            <p className="mt-3 text-caption text-ink-muted">{t('dashboard.forecastNote')}</p>
            {info.forecast.ok ? (
              <ul className="mt-3 divide-y divide-divider">
                {info.forecast.invoices
                  .filter(
                    (invoice) =>
                      !lease.invoices.some(
                        (actual) => actual.dueDate === invoice.dueDate && actual.status === 'issued'
                      )
                  )
                  .map((invoice) => (
                    <li
                      key={invoice.dueDate}
                      className="flex flex-wrap justify-between gap-2 py-3 text-caption"
                    >
                      <span>{formatIsoDate(invoice.dueDate, locale)}</span>
                      <span>
                        {currency(invoice.totalCents)} · {t('dashboard.estimated')}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-3 text-caption">{t('dashboard.forecastUnavailable')}</p>
            )}
          </details>
        </section>
        <section className={card}>
          <h3 className="text-tagline font-semibold">{t('dashboard.timeline')}</h3>
          {timeline.length ? (
            <ol className="mt-5 space-y-4">
              {timeline.map((event) => (
                <li key={event.id} className="border-l-2 border-hairline pl-4">
                  <p className="font-semibold">{event.label}</p>
                  <time className="text-caption text-ink-muted" dateTime={event.date}>
                    {formatIsoDate(event.date, locale)}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-body text-ink-muted">{t('dashboard.noEvents')}</p>
          )}
        </section>
      </div>
      <div className="space-y-6">
        <section className={card}>
          <h3 className="text-tagline font-semibold">{t('dashboard.manage')}</h3>
          <p className="mt-3 text-body text-ink-muted">{t('dashboard.manageInfo')}</p>
          <dl className="mt-5 space-y-4">
            <Fact label={t('dashboard.request.return')} value={t('dashboard.returnTerms')} />
            <Fact
              label={t('dashboard.request.buyout')}
              value={t('dashboard.buyoutTerms', { amount: currency(lease.buyoutCents) })}
            />
            <Fact label={t('dashboard.request.exchange')} value={t('dashboard.exchangeTerms')} />
          </dl>
          <LeaseRequestControls
            locale={locale}
            id={lease.id}
            disabled={pending || lease.status !== 'active'}
          />
        </section>
        <section className={card}>
          <h3 className="text-tagline font-semibold">{t('dashboard.passport')}</h3>
          <p className="mt-3 text-caption text-ink-muted">{t('dashboard.passportIntro')}</p>
          <dl className="mt-5 grid grid-cols-2 gap-5">
            <Fact label={t('condition.label')} value={t(`condition.${lease.asset.condition}`)} />
            <Fact label={t('asset.modelYear')} value={String(lease.asset.model_year)} />
            <Fact
              label={t('asset.previousLives')}
              value={formatNumber(lease.asset.previous_lives, locale)}
            />
            <Fact
              label={t('asset.usage')}
              value={t(`usage.${lease.asset.usage_unit}`, {
                value: formatNumber(lease.asset.usage_value, locale),
              })}
            />
          </dl>
          <div className="mt-6 border-t border-divider pt-5">
            <p className="text-caption text-ink-muted">{t('dashboard.impactTitle')}</p>
            <p className="mt-2 text-tagline font-semibold">
              {t('dashboard.impactValue', { amount: formatNumber(impact, locale) })}
            </p>
            <p className="mt-3 text-caption text-ink-muted">
              {t(lease.asset.previous_lives ? 'dashboard.impactNote' : 'dashboard.noImpact')}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="mt-1 text-body font-semibold wrap-anywhere">{value}</dd>
    </div>
  );
}
