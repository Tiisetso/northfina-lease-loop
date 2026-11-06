import type { Co2Factors, VatRate } from '@/data/schemas';
import { invoiceAmounts, paymentStatus } from '@/domain/lease-billing';
import { paidForInvoice, summarizeLease } from '@/domain/lease-dashboard';
import { forecastPaymentChanges } from '@/domain/forecast-changes';
import { reuseEstimate } from '@/domain/lease-insights';
import { formatEuro } from '@/domain/money';
import { formatIsoDate, formatNumber } from '@/i18n/format';
import { getT, type MessageKey } from '@/i18n/get-t';
import { intlLocale, type Locale } from '@/i18n/locales';
import type { CustomerLease } from '@/server/leases';
import { recoveryCalculationSchema, type RecoveryCalculation } from '@/server/recovery-input';
import { LeaseRequestControls, ReturnQuoteAccept } from './lease-controls';
import { ProductPhoto } from './product-photo';

type Props = {
  locale: Locale;
  lease: CustomerLease;
  rates: VatRate[];
  factors: Co2Factors;
  today: string;
};
const panel = 'rounded-lg border border-hairline bg-canvas p-5 sm:p-6';

export function LeaseDetail({ locale, lease, rates, factors, today }: Props) {
  const t = getT(locale);
  const info = summarizeLease(lease, rates, today);
  const currency = (cents: number) => formatEuro(cents, intlLocale[locale]);
  const currentRate = rates.find(
    (rate) => rate.valid_from <= today && (rate.valid_to === null || rate.valid_to >= today)
  );
  const startRate = rates.find(
    (rate) =>
      rate.valid_from <= lease.startDate &&
      (rate.valid_to === null || rate.valid_to >= lease.startDate)
  );
  const endRate = rates.find(
    (rate) =>
      rate.valid_from <= info.endDate && (rate.valid_to === null || rate.valid_to >= info.endDate)
  );
  const gross = (cents: number, rate: VatRate | undefined) =>
    rate
      ? currency(invoiceAmounts(cents, Math.round(rate.rate_percent * 100)).totalCents)
      : t('dashboard.forecastUnavailable');
  const returnRequest = lease.requests.find((request) => request.assessment);
  const assessment = returnRequest?.assessment;
  let quote: RecoveryCalculation | null = null;
  if (assessment) {
    try {
      const parsed = recoveryCalculationSchema.safeParse(JSON.parse(assessment.calculationJson));
      if (parsed.success) quote = parsed.data;
    } catch {
      /* A missing quote remains unavailable rather than displaying invented numbers. */
    }
  }
  const pending = lease.requests.some(
    (request) =>
      request.status === 'pending' ||
      (request.assessment && ['quoted', 'accepted'].includes(request.assessment.status))
  );
  const forecastPeriods =
    info.forecast.ok && lease.status === 'active'
      ? forecastPaymentChanges(
          info.forecast.invoices,
          lease.invoices
            .filter((invoice) => invoice.status === 'issued')
            .map((invoice) => invoice.dueDate),
          today
        )
      : [];
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
  return (
    <div className="mt-5 grid items-start gap-6 desktop:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <section className={panel}>
          <div className="flex items-start gap-5">
            <div className="w-28 shrink-0 sm:w-40">
              <ProductPhoto
                assetId={lease.asset.id}
                productName={`${lease.asset.make} ${lease.asset.model}`}
                locale={locale}
                showCaption={false}
                sizes="160px"
              />
            </div>
            <div className="min-w-0">
              <span
                className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-fine font-semibold ${lease.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-parchment text-ink-muted'}`}
              >
                <span
                  className={`size-1.5 rounded-full ${lease.status === 'active' ? 'bg-emerald-600' : 'bg-ink-muted'}`}
                  aria-hidden="true"
                />
                {t(`dashboard.status.${lease.status}`)}
              </span>
              <h2 className="mt-3 text-tagline font-semibold wrap-anywhere">
                {lease.asset.make} {lease.asset.model}
              </h2>
              <p className="mt-2 text-caption text-ink-muted">
                {t(`condition.${lease.asset.condition}`)} · {lease.asset.model_year}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-5 border-t border-divider pt-5">
            <Fact label={t('dashboard.started')} value={formatIsoDate(lease.startDate, locale)} />
            <Fact label={t('dashboard.ends')} value={formatIsoDate(info.endDate, locale)} />
          </dl>
          <div className="mt-5">
            <div className="flex flex-wrap justify-between gap-2 text-caption">
              <span className="text-ink-muted">{t('dashboard.progress')}</span>
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
        </section>

        {assessment && returnRequest ? (
          <section className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-tagline font-semibold">
                {t(returnRequest.kind === 'buyout' ? 'return.buyoutTitle' : 'return.requestTitle')}
              </h3>
              <span className="rounded-pill bg-parchment px-3 py-1 text-caption">
                {t(`return.stage.${assessment.status}` as MessageKey)}
              </span>
            </div>
            {quote ? (
              <>
                <p className="mt-4 text-caption text-ink-muted">
                  {t(returnRequest.kind === 'buyout' ? 'return.buyoutNow' : 'return.total')}
                </p>
                <p className="mt-1 text-display-sm font-semibold">
                  {currency(
                    returnRequest.kind === 'buyout'
                      ? quote.settlement.buyoutTotalCents
                      : quote.settlement.returnTotalCents
                  )}
                </p>
                <p className="mt-2 text-caption text-ink-muted">
                  {t('return.quoteNote', { date: formatIsoDate(quote.quoteDate, locale) })}
                </p>
                <details className="mt-4 border-t border-divider pt-4">
                  <summary className="cursor-pointer text-caption font-semibold text-primary">
                    {t('return.calculation')}
                  </summary>
                  <p className="mt-3 text-caption text-ink-muted">
                    {t(
                      returnRequest.kind === 'buyout'
                        ? 'return.buyoutMethod'
                        : 'return.returnMethod'
                    )}
                  </p>
                </details>
                {assessment.status === 'quoted' && quote.quoteDate === today ? (
                  <ReturnQuoteAccept
                    locale={locale}
                    id={lease.id}
                    requestId={returnRequest.id}
                    expectedAssessmentUpdatedAt={assessment.updatedAt.toISOString()}
                    action={returnRequest.kind === 'buyout' ? 'buyout' : 'accept'}
                  />
                ) : null}
                {assessment.status === 'quoted' && quote.quoteDate !== today ? (
                  <p className="mt-3 text-caption">{t('return.quoteExpired')}</p>
                ) : null}
              </>
            ) : null}
            {assessment.status === 'accepted' ? (
              <p className="mt-4 text-caption text-ink-muted">{t('return.acceptedNote')}</p>
            ) : null}
          </section>
        ) : null}

        <section className={panel}>
          <h3 className="text-tagline font-semibold">{t('dashboard.paymentDetails')}</h3>
          <p className="mt-2 text-caption text-ink-muted">{t('dashboard.includesVat')}</p>
          <details className="mt-4 border-t border-divider pt-4">
            <summary className="cursor-pointer text-body font-semibold">
              {t('dashboard.forecastSchedule')}
            </summary>
            <p className="mt-3 text-caption text-ink-muted">{t('dashboard.forecastChangesNote')}</p>
            {info.forecast.ok ? (
              forecastPeriods.length ? (
                <ul className="mt-2 divide-y divide-divider">
                  {forecastPeriods.map((period) => (
                    <li key={period.startDate} className="py-4 text-caption">
                      <div className="flex flex-wrap justify-between gap-3">
                        <p>
                          <time dateTime={period.startDate}>
                            {formatIsoDate(period.startDate, locale)}
                          </time>
                          {period.endDate !== period.startDate ? (
                            <>
                              {' '}
                              –{' '}
                              <time dateTime={period.endDate}>
                                {formatIsoDate(period.endDate, locale)}
                              </time>
                            </>
                          ) : null}
                        </p>
                        <p className="font-semibold">
                          {currency(period.totalCents)} / {t('dashboard.month')}
                        </p>
                      </div>
                      <p className="mt-1 text-fine text-ink-muted">
                        {t('dashboard.estimated')} ·{' '}
                        {t('dashboard.vatRate', {
                          rate: formatNumber(period.vatBasisPoints / 100, locale),
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-caption">{t('dashboard.noForecastPayments')}</p>
              )
            ) : (
              <p className="mt-3 text-caption">{t('dashboard.forecastUnavailable')}</p>
            )}
          </details>
          <details className="mt-4 border-t border-divider pt-4">
            <summary className="cursor-pointer text-body font-semibold">
              {t('dashboard.issuedInvoices')}
            </summary>
            {lease.invoices.filter((invoice) => invoice.status === 'issued').length ? (
              <ul className="mt-2 divide-y divide-divider">
                {lease.invoices
                  .filter((invoice) => invoice.status === 'issued')
                  .map((invoice) => {
                    const total = invoice.netCents + invoice.vatCents;
                    const paid = paidForInvoice(invoice, lease.isDemo);
                    return (
                      <li key={invoice.id} className="py-4 text-caption">
                        <div className="flex flex-wrap justify-between gap-3">
                          <time dateTime={invoice.dueDate}>
                            {formatIsoDate(invoice.dueDate, locale)}
                          </time>
                          <p className="font-semibold">
                            {currency(total)} ·{' '}
                            {t(
                              `dashboard.invoiceStatus.${paymentStatus(total, paid, invoice.dueDate, today)}`
                            )}
                          </p>
                        </div>
                        <p className="mt-2 text-fine text-ink-muted">
                          {t('dashboard.paidAmount', { amount: currency(paid) })}
                        </p>
                      </li>
                    );
                  })}
              </ul>
            ) : (
              <p className="mt-3 text-caption text-ink-muted">{t('dashboard.noInvoices')}</p>
            )}
          </details>
          <details className="mt-4 border-t border-divider pt-4">
            <summary className="cursor-pointer text-body font-semibold">
              {t('dashboard.priceBreakdown')}
            </summary>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Fact
                label={t('dashboard.listPriceGross')}
                value={gross(lease.listPriceCents, startRate)}
              />
              <Fact
                label={t('dashboard.downPaymentGross')}
                value={gross(lease.downPaymentCents, startRate)}
              />
              <Fact label={t('dashboard.buyoutGross')} value={gross(lease.buyoutCents, endRate)} />
              {info.forecastTotalCents !== null ? (
                <Fact label={t('dashboard.totalGross')} value={currency(info.forecastTotalCents)} />
              ) : null}
            </dl>
            <p className="mt-4 text-caption text-ink-muted">{t('dashboard.forecastTotalNote')}</p>
          </details>
        </section>

        <details className={panel}>
          <summary className="cursor-pointer text-body font-semibold">
            {t('dashboard.passport')}
          </summary>
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
          <div className="mt-5 border-t border-divider pt-4">
            <p className="text-caption text-ink-muted">{t('dashboard.impactTitle')}</p>
            <p className="mt-2 text-tagline font-semibold">
              {t('dashboard.impactValue', { amount: formatNumber(impact, locale) })}
            </p>
            <p className="mt-2 text-caption text-ink-muted">
              {t(lease.asset.previous_lives ? 'dashboard.impactNote' : 'dashboard.noImpact')}
            </p>
          </div>
        </details>
        <details className={panel}>
          <summary className="cursor-pointer text-body font-semibold">
            {t('dashboard.timeline')}
          </summary>
          {timeline.length ? (
            <ol className="mt-4 space-y-4">
              {timeline.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap justify-between gap-3 border-l-2 border-hairline pl-4 text-caption"
                >
                  <p>{event.label}</p>
                  <time className="text-ink-muted" dateTime={event.date}>
                    {formatIsoDate(event.date, locale)}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-caption text-ink-muted">{t('dashboard.noEvents')}</p>
          )}
        </details>
      </div>

      <aside className={`${panel} desktop:sticky desktop:top-40`}>
        <h3 className="text-tagline font-semibold">{t('dashboard.yourNumbers')}</h3>
        <p className="mt-5 text-caption text-ink-muted">{t('dashboard.nextPayment')}</p>
        <p className="mt-1 text-display-sm font-semibold tabular-nums">
          {lease.status === 'active' && info.next
            ? currency(info.next.amountCents)
            : t('dashboard.noNext')}
        </p>
        {lease.status === 'active' && info.next ? (
          <p className="mt-2 text-caption text-ink-muted">
            {formatIsoDate(info.next.dueDate, locale)} ·{' '}
            {t(info.next.kind === 'forecast' ? 'dashboard.estimated' : 'dashboard.issued')}
          </p>
        ) : null}
        <dl className="mt-5 space-y-4 border-t border-divider pt-5">
          <Fact
            label={t('dashboard.monthlyGross')}
            value={`${gross(lease.monthlyNetCents, currentRate)} / ${t('dashboard.month')}`}
          />
          <Fact label={t('dashboard.paidSoFar')} value={currency(info.paidCents)} />
          <Fact label={t('dashboard.outstanding')} value={currency(info.outstandingCents)} />
          <Fact
            label={t(
              quote && assessment?.status === 'quoted' && quote.quoteDate === today
                ? 'return.buyoutNow'
                : 'dashboard.buyoutGross'
            )}
            value={
              quote && assessment?.status === 'quoted' && quote.quoteDate === today
                ? currency(quote.settlement.buyoutTotalCents)
                : gross(lease.buyoutCents, endRate)
            }
          />
        </dl>
        <p className="mt-3 text-fine text-ink-muted">
          {t('dashboard.includesVat')} · {t('dashboard.buyoutEstimate')}
        </p>
        <div className="mt-5 border-t border-divider pt-5">
          <h3 className="text-body font-semibold">{t('dashboard.manage')}</h3>
          <LeaseRequestControls
            locale={locale}
            id={lease.id}
            disabled={pending || lease.status !== 'active'}
          />
        </div>
      </aside>
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
