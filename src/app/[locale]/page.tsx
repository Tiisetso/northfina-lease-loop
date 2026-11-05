// The catalogue: every asset, grouped by category, with today's net list price.
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
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
    <div>
      <div className="bg-canvas px-card py-section-compact text-center tablet:py-section">
        <div className="mx-auto max-w-copy">
          <h1 className="font-display text-display-sm font-semibold phone:text-display-md grid:text-display-lg desktop:text-hero">
            {t('catalogue.title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-body tablet:font-display tablet:text-lead">
            {t('catalogue.intro')}
          </p>
          <p className="mt-8 text-caption text-ink-muted">
            <time dateTime={today}>
              {t('catalogue.pricesOn', { date: formatIsoDate(today, locale) })}
            </time>
          </p>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="mx-auto max-w-copy px-card py-section-compact text-center text-body text-ink-muted">
          {t('catalogue.empty')}
        </p>
      ) : null}

      {groups.map((group, index) => (
        <section
          key={group.category}
          aria-labelledby={`category-${group.category}`}
          className={`px-card py-section-compact tablet:py-section ${index % 2 === 0 ? 'bg-parchment text-ink' : 'bg-tile text-on-dark'}`}
        >
          <div className="mx-auto max-w-content">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2
                id={`category-${group.category}`}
                className="font-display text-display-sm font-semibold tablet:text-display-lg"
              >
                {t(`category.${group.category}`)}
              </h2>
              <p
                className={`text-caption ${index % 2 === 0 ? 'text-ink-muted' : 'text-body-muted'}`}
              >
                {t('catalogue.itemCount', { count: group.assets.length })}
              </p>
            </div>
            <ul className="mt-12 grid gap-card grid:grid-cols-2 desktop:grid-cols-3 wide:grid-cols-4">
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
          </div>
        </section>
      ))}
    </div>
  );
}
