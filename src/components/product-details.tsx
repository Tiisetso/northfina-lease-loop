import type { Asset } from '@/data/schemas';
import { formatNumber } from '@/i18n/format';
import { getT } from '@/i18n/get-t';
import type { Locale } from '@/i18n/locales';

export function ProductDetails({ asset, locale }: { asset: Asset; locale: Locale }) {
  const t = getT(locale);
  const facts = [
    [t('product.make'), asset.make],
    [t('product.model'), asset.model],
    [t('asset.modelYear'), String(asset.model_year)],
    [t('condition.label'), t(`condition.${asset.condition}`)],
    [
      t(`product.usage.${asset.category}`),
      t(`usage.${asset.usage.unit}`, { value: formatNumber(asset.usage.value, locale) }),
    ],
    [t('asset.previousLives'), formatNumber(asset.previous_lives, locale)],
    [t('product.serialNumber'), asset.serial_number],
    [t('status.label'), t(`status.${asset.status}`)],
  ];

  return (
    <>
      <section
        aria-labelledby="product-details"
        className="bg-parchment px-card py-section-compact tablet:py-section"
      >
        <div className="mx-auto max-w-copy">
          <h2
            id="product-details"
            className="font-display text-display-sm font-semibold tablet:text-display-lg"
          >
            {t('product.details')}
          </h2>
          <p className="mt-4 max-w-2xl text-body text-ink-muted">
            {t(`product.description.${asset.category}`)}
          </p>
          <dl className="mt-8 grid gap-x-section grid:grid-cols-2">
            {facts.map(([label, value]) => (
              <div
                key={label}
                className="flex min-w-0 flex-wrap justify-between gap-x-6 gap-y-2 border-b border-hairline py-5 text-caption"
              >
                <dt className="text-ink-muted">{label}</dt>
                <dd className="font-semibold wrap-anywhere">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section
        aria-labelledby="product-next-life"
        className="bg-tile px-card py-section-compact text-on-dark tablet:py-section"
      >
        <div className="mx-auto max-w-copy">
          <h2
            id="product-next-life"
            className="font-display text-display-sm font-semibold tablet:text-display-lg"
          >
            {t('product.endTitle')}
          </h2>
          <p className="mt-4 text-body text-body-muted">{t('product.endIntro')}</p>
          <div className="mt-12 grid gap-8 grid:grid-cols-3">
            {(['buy', 'return', 'pass'] as const).map((option) => (
              <div key={option}>
                <h3 className="text-tagline font-semibold">{t(`product.end.${option}.title`)}</h3>
                <p className="mt-4 text-caption text-body-muted">
                  {t(`product.end.${option}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
