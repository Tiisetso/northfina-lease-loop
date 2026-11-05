import type { Asset } from '@/data/schemas';
import { formatNumber } from '@/i18n/format';
import { getT } from '@/i18n/get-t';
import type { Locale } from '@/i18n/locales';

export function ProductDetails({ asset, locale }: { asset: Asset; locale: Locale }) {
  const t = getT(locale);
  const highlights = [
    [t('condition.label'), t(`condition.${asset.condition}`)],
    [
      t(`product.usage.${asset.category}`),
      t(`usage.${asset.usage.unit}`, { value: formatNumber(asset.usage.value, locale) }),
    ],
    [t('asset.previousLives'), formatNumber(asset.previous_lives, locale)],
  ];
  const facts = [
    [t('product.make'), asset.make],
    [t('product.model'), asset.model],
    [t('asset.modelYear'), String(asset.model_year)],
    [t('product.serialNumber'), asset.serial_number],
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-section-compact sm:px-6 tablet:pb-section">
      <section
        aria-labelledby="product-details"
        className="border-t border-hairline pt-10 tablet:pt-12"
      >
        <div className="grid gap-6 tablet:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] tablet:gap-12">
          <div>
            <p className="text-caption font-semibold text-primary">
              {t(`category.${asset.category}`)}
            </p>
            <h2
              id="product-details"
              className="mt-3 max-w-sm font-display text-display-sm font-semibold"
            >
              {t('product.details')}
            </h2>
            <p className="mt-4 max-w-lg text-body text-ink-muted">
              {t(`product.description.${asset.category}`)}
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-5 rounded-lg bg-parchment p-6 min-[30rem]:grid-cols-3 tablet:p-8">
            {highlights.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-caption text-ink-muted">{label}</dt>
                <dd className="mt-2 text-tagline font-semibold wrap-anywhere">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <dl className="mt-8 grid gap-x-10 tablet:grid-cols-2">
          {facts.map(([label, value]) => (
            <div
              key={label}
              className="flex min-w-0 flex-wrap justify-between gap-x-6 gap-y-2 border-b border-hairline py-4 text-caption"
            >
              <dt className="text-ink-muted">{label}</dt>
              <dd className="font-semibold wrap-anywhere">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="product-next-life"
        className="mt-12 rounded-lg bg-parchment p-6 tablet:mt-16 tablet:p-8"
      >
        <h2 id="product-next-life" className="font-display text-display-sm font-semibold">
          {t('product.endTitle')}
        </h2>
        <p className="mt-3 max-w-2xl text-body text-ink-muted">{t('product.endIntro')}</p>
        <div className="mt-8 grid gap-6 tablet:grid-cols-3">
          {(['buy', 'return', 'pass'] as const).map((option) => (
            <div key={option} className="border-t border-hairline pt-5">
              <LifeIcon option={option} />
              <h3 className="mt-4 text-body font-semibold">{t(`product.end.${option}.title`)}</h3>
              <p className="mt-2 text-caption text-ink-muted">{t(`product.end.${option}.body`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function LifeIcon({ option }: { option: 'buy' | 'return' | 'pass' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6 text-primary"
    >
      {option === 'buy' ? (
        <>
          <path d="M5 8h14l1 13H4L5 8Z" />
          <path d="M8 8V6a4 4 0 0 1 8 0v2M9 14l2 2 4-4" />
        </>
      ) : option === 'return' ? (
        <>
          <path d="M8 7H4V3" />
          <path d="M4 7a8 8 0 1 1-1 8M9 12h6" />
        </>
      ) : (
        <>
          <path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4" />
        </>
      )}
    </svg>
  );
}
