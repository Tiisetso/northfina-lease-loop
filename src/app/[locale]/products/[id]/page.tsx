import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { LeaseCalculator } from '@/components/lease-calculator';
import { ProductDetails } from '@/components/product-details';
import { loadCoefficientTable, loadPriceLists } from '@/data/load';
import { formatEuro } from '@/domain/money';
import { listPriceOn } from '@/domain/price-list';
import { formatIsoDate } from '@/i18n/format';
import { getT } from '@/i18n/get-t';
import { intlLocale, isLocale } from '@/i18n/locales';
import { toAsset } from '@/server/assets';
import { db } from '@/server/db';
import { todayIso } from '@/server/today';

export default async function ProductPage({ params }: PageProps<'/[locale]/products/[id]'>) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  await connection();
  const [row, lists, table] = await Promise.all([
    db.asset.findUnique({ where: { id } }),
    loadPriceLists(),
    loadCoefficientTable(),
  ]);
  if (!row) notFound();
  const asset = toAsset(row);
  const today = todayIso();
  const price = listPriceOn(lists, id, today);
  const t = getT(locale);

  return (
    <div>
      <div className="mx-auto max-w-content px-card pt-8 pb-section-compact tablet:pb-section">
        <nav
          aria-label={t('product.breadcrumb')}
          className="flex flex-wrap items-center gap-3 text-caption"
        >
          <Link href={`/${locale}`} className="inline-flex min-h-target items-center text-primary">
            {t('product.back')}
          </Link>
          <span aria-hidden="true" className="text-ink-muted">
            /
          </span>
          <Link
            href={`/${locale}#category-${asset.category}`}
            className="inline-flex min-h-target items-center text-primary"
          >
            {t(`category.${asset.category}`)}
          </Link>
          <span aria-hidden="true" className="text-ink-muted">
            /
          </span>
          <span className="text-ink-muted">{asset.model}</span>
        </nav>

        <div className="mt-8 grid items-start gap-section-compact tablet:grid-cols-2 desktop:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] desktop:gap-section">
          <div className="min-w-0">
            {/* Intentionally blank: product photography will be supplied separately. */}
            <div
              role="img"
              aria-label={t('product.imagePlaceholder')}
              className="aspect-square rounded-lg bg-parchment"
            />
            <div aria-hidden="true" className="mt-4 flex justify-center gap-3">
              {[0, 1, 2].map((slot) => (
                <div key={slot} className="size-16 rounded-sm bg-parchment" />
              ))}
            </div>
          </div>

          <section aria-labelledby="product-title" className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 text-caption">
              <p className="text-ink-muted">{asset.make}</p>
              <p className="rounded-pill bg-parchment px-4 py-2">{t(`status.${asset.status}`)}</p>
            </div>
            <h1
              id="product-title"
              className="mt-4 font-display text-display-sm font-semibold wrap-anywhere grid:text-display-md desktop:text-display-lg"
            >
              {asset.make} {asset.model}
            </h1>
            <p className="mt-4 text-body text-ink-muted">{t('product.intro')}</p>
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4 text-caption">
              <div>
                <dt className="text-ink-muted">{t('condition.label')}</dt>
                <dd className="mt-1 font-semibold">{t(`condition.${asset.condition}`)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">{t('asset.modelYear')}</dt>
                <dd className="mt-1 font-semibold">{asset.model_year}</dd>
              </div>
            </dl>
            <div className="mt-8 rounded-lg border border-hairline p-card">
              <h2 className="text-tagline font-semibold">{t('product.configure')}</h2>
              {asset.status !== 'available' ? (
                <p className="mt-4 text-caption text-ink-muted" role="status">
                  {t('product.unavailable')}
                </p>
              ) : null}
              {price.ok ? (
                <LeaseCalculator
                  key={asset.id}
                  priceCents={price.priceCents}
                  table={table}
                  locale={locale}
                />
              ) : (
                <p className="mt-4">{t('asset.noPrice')}</p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap justify-between gap-3 text-caption text-ink-muted">
              <span>{t('asset.listPrice')}</span>
              <span className="font-semibold tabular-nums text-ink">
                {price.ok ? formatEuro(price.priceCents, intlLocale[locale]) : t('asset.noPrice')}
              </span>
            </div>
            <p className="mt-2 text-fine text-ink-muted">
              <time dateTime={today}>
                {t('catalogue.pricesOn', { date: formatIsoDate(today, locale) })}
              </time>
              {price.ok
                ? ` · ${t('asset.priceListVersion', { version: price.priceListVersion })}`
                : null}
            </p>
          </section>
        </div>
      </div>
      <ProductDetails asset={asset} locale={locale} />
    </div>
  );
}
