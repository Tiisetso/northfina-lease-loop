import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { ProductPhoto } from '@/components/product-photo';
import { loadPriceLists } from '@/data/load';
import { formatEuro } from '@/domain/money';
import { listPriceOn } from '@/domain/price-list';
import { formatIsoDate, formatNumber } from '@/i18n/format';
import { getT } from '@/i18n/get-t';
import { intlLocale, isLocale } from '@/i18n/locales';
import { findAsset } from '@/server/assets';
import { db } from '@/server/db';
import { todayIso } from '@/server/today';

export default async function ProductPage({ params }: PageProps<'/[locale]/products/[id]'>) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  await connection();
  const [asset, priceLists] = await Promise.all([findAsset(db, id), loadPriceLists()]);
  if (!asset) notFound();
  const t = getT(locale);
  const today = todayIso();
  const price = listPriceOn(priceLists, id, today);
  return (
    <div className="bg-parchment px-card py-section-compact text-ink tablet:py-section">
      <div className="mx-auto max-w-content">
        <Link href={`/${locale}`} className="inline-flex min-h-target items-center text-primary">
          ← {t('product.back')}
        </Link>
        <div className="mt-6 grid gap-8 tablet:grid-cols-2 tablet:gap-12">
          <ProductPhoto
            assetId={asset.id}
            productName={`${asset.make} ${asset.model}`}
            locale={locale}
            sizes="(min-width: 834px) 50vw, 100vw"
          />
          <div>
            <p className="text-caption text-ink-muted">{asset.make}</p>
            <h1 className="mt-2 font-display text-display-sm font-semibold tablet:text-display-lg">
              {asset.model}
            </h1>
            <p className="mt-4 inline-block rounded-sm bg-canvas px-3 py-1 text-caption">
              {t('status.label')}: {t(`status.${asset.status}`)}
            </p>
            <div className="mt-8 rounded-lg border border-hairline bg-canvas p-card">
              <h2 className="text-tagline font-semibold">{t('product.details')}</h2>
              <dl className="mt-6 grid grid-cols-2 gap-6 text-body">
                <div>
                  <dt className="text-caption text-ink-muted">{t('condition.label')}</dt>
                  <dd className="mt-1 font-semibold">{t(`condition.${asset.condition}`)}</dd>
                </div>
                <div>
                  <dt className="text-caption text-ink-muted">{t('asset.modelYear')}</dt>
                  <dd className="mt-1 font-semibold">{asset.model_year}</dd>
                </div>
                <div>
                  <dt className="text-caption text-ink-muted">{t('asset.usage')}</dt>
                  <dd className="mt-1 font-semibold">
                    {t(`usage.${asset.usage.unit}`, {
                      value: formatNumber(asset.usage.value, locale),
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-ink-muted">{t('asset.previousLives')}</dt>
                  <dd className="mt-1 font-semibold">
                    {formatNumber(asset.previous_lives, locale)}
                  </dd>
                </div>
              </dl>
              <div className="mt-8 border-t border-divider pt-6">
                <p className="text-caption text-ink-muted">{t('asset.listPrice')}</p>
                <p className="mt-2 text-display-sm font-semibold tabular-nums">
                  {price.ok ? formatEuro(price.priceCents, intlLocale[locale]) : t('asset.noPrice')}
                </p>
                <p className="mt-2 text-caption text-ink-muted">
                  {t('product.pricesOn', { date: formatIsoDate(today, locale) })}
                </p>
                {price.ok ? (
                  <p className="text-caption text-ink-muted">
                    {t('asset.priceListVersion', { version: price.priceListVersion })}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
