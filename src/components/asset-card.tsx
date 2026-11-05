// One catalogue item. A server component: it renders to HTML and ships no JavaScript.
import Link from 'next/link';
import type { Asset } from '@/data/schemas';
import { formatEuro } from '@/domain/money';
import type { ListPriceResult } from '@/domain/price-list';
import { formatNumber } from '@/i18n/format';
import type { Translate } from '@/i18n/get-t';
import { intlLocale, type Locale } from '@/i18n/locales';
import { ProductPhoto } from './product-photo';

type AssetCardProps = {
  asset: Asset;
  price: ListPriceResult;
  locale: Locale;
  t: Translate;
};

export function AssetCard({ asset, price, locale, t }: AssetCardProps) {
  const headingId = `asset-${asset.id}`;

  return (
    <article
      aria-labelledby={headingId}
      className="flex h-full min-w-0 flex-col rounded-lg border border-hairline bg-canvas p-card text-ink"
    >
      <div className="mb-6">
        <ProductPhoto
          assetId={asset.id}
          productName={`${asset.make} ${asset.model}`}
          locale={locale}
        />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption text-ink-muted">{asset.make}</p>
          <h3 id={headingId} className="mt-2 text-body font-semibold wrap-anywhere">
            {asset.model}
          </h3>
        </div>
        <p className="rounded-sm bg-parchment px-2 py-1 text-caption text-ink-muted">
          <span className="sr-only">{t('status.label')}: </span>
          {t(`status.${asset.status}`)}
        </p>
      </div>

      <dl className="my-8 grid grid-cols-2 gap-x-4 gap-y-6 text-caption">
        <Fact label={t('condition.label')} value={t(`condition.${asset.condition}`)} />
        <Fact label={t('asset.modelYear')} value={String(asset.model_year)} />
        <Fact
          label={t('asset.usage')}
          value={t(`usage.${asset.usage.unit}`, { value: formatNumber(asset.usage.value, locale) })}
        />
        <Fact label={t('asset.previousLives')} value={formatNumber(asset.previous_lives, locale)} />
      </dl>

      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-divider pt-6">
        <div className="text-fine text-ink-muted">
          <p>{t('asset.listPrice')}</p>
          {price.ok ? (
            <p>{t('asset.priceListVersion', { version: price.priceListVersion })}</p>
          ) : null}
        </div>
        <p className="text-body tabular-nums">
          {price.ok ? formatEuro(price.priceCents, intlLocale[locale]) : t('asset.noPrice')}
        </p>
      </div>
      <Link
        href={`/${locale}/products/${encodeURIComponent(asset.id)}`}
        className="mt-3 inline-flex min-h-target items-center text-body text-primary"
      >
        {t('catalogue.viewProduct')} →
      </Link>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="mt-1 font-semibold wrap-anywhere">{value}</dd>
    </div>
  );
}
