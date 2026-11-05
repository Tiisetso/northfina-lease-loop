// The catalogue: every asset, grouped by category, with today's net list price.
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import Link from 'next/link';
import { AssetCard } from '@/components/asset-card';
import { loadPriceLists } from '@/data/load';
import { assetCategorySchema } from '@/data/schemas';
import { listPriceOn } from '@/domain/price-list';
import { formatIsoDate } from '@/i18n/format';
import { getT } from '@/i18n/get-t';
import { isLocale } from '@/i18n/locales';
import { listAssets } from '@/server/assets';
import { db } from '@/server/db';
import { todayIso } from '@/server/today';

export default async function CataloguePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // Render on every request: prices depend on today's date and on the database.
  await connection();

  const t = getT(locale);
  const today = todayIso(); // the page decides what "today" is; domain code never reads the clock
  const [assets, priceLists] = await Promise.all([listAssets(db), loadPriceLists()]);
  const groups = assetCategorySchema.options
    .map((category) => ({ category, assets: assets.filter((a) => a.category === category) }))
    .filter((group) => group.assets.length > 0);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 tablet:py-14">
      <header>
        <h1 className="font-display text-display-sm font-semibold tablet:text-display-lg">
          {t('catalogue.title')}
        </h1>
        <p className="mt-3 max-w-2xl text-body">{t('catalogue.intro')}</p>
        <p className="mt-4 text-caption text-ink-muted">
          <time dateTime={today}>
            {t('catalogue.pricesOn', { date: formatIsoDate(today, locale) })}
          </time>
        </p>
        <p className="mt-2 text-caption text-ink-muted">
          {t('catalogue.photosIllustrative')}{' '}
          <Link
            href={`/${locale}/photo-credits`}
            className="text-primary underline underline-offset-2"
          >
            {t('catalogue.photoCredits')}
          </Link>
        </p>
      </header>

      {groups.length === 0 ? (
        <p className="mt-12 text-body text-ink-muted">{t('catalogue.empty')}</p>
      ) : null}

      {groups.map((group) => (
        <section
          key={group.category}
          aria-labelledby={`category-${group.category}`}
          className="mt-12"
        >
          <h2 id={`category-${group.category}`} className="font-display text-tagline font-semibold">
            {t(`category.${group.category}`)}
          </h2>
          <ul className="mt-6 grid gap-x-5 gap-y-10 min-[30rem]:grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4">
            {group.assets.map((asset) => (
              <li key={asset.id}>
                <AssetCard
                  asset={asset}
                  price={listPriceOn(priceLists, asset.id, today)}
                  locale={locale}
                  t={t}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
