import Image from 'next/image';
import Link from 'next/link';
import { photoForAsset } from '@/data/product-photos';
import { getT } from '@/i18n/get-t';
import type { Locale } from '@/i18n/locales';

type ProductPhotoProps = {
  assetId: string;
  productName: string;
  locale: Locale;
  sizes?: string;
};

/** Photos illustrate the fictional model, not the physical item or its condition. */
export function ProductPhoto({
  assetId,
  productName,
  locale,
  sizes = '(min-width: 1069px) 33vw, (min-width: 641px) 50vw, 100vw',
}: ProductPhotoProps) {
  const t = getT(locale);
  const photo = photoForAsset(assetId);
  return (
    <figure>
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-parchment">
        {photo ? (
          <Image
            src={photo.src}
            alt={t('photo.alt', { product: productName })}
            fill
            sizes={sizes}
            className="object-contain"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-caption text-ink-muted">
            {t('photo.missing')}
          </span>
        )}
      </div>
      {photo ? (
        <figcaption className="mt-2 text-fine text-ink-muted">
          {t('photo.representative')} ·{' '}
          <Link
            href={`/${locale}/photo-credits#photo-${photo.key}`}
            className="text-primary underline underline-offset-2"
          >
            {t('photo.credits')}
          </Link>
        </figcaption>
      ) : null}
    </figure>
  );
}
