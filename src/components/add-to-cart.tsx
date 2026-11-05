'use client';
import Link from 'next/link';
import { getT } from '@/i18n/get-t';
import type { Locale } from '@/i18n/locales';
import { setCart, useCart } from './cart-store';
export function AddToCart({
  id,
  locale,
  available,
  termMonths,
  downPaymentCents,
}: {
  id: string;
  locale: Locale;
  available: boolean;
  termMonths: number;
  downPaymentCents: number;
}) {
  const t = getT(locale);
  const items = useCart();
  const added = items.some((item) => item.id === id);
  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={!available || (!added && items.length >= 10)}
        onClick={() =>
          setCart([...items.filter((item) => item.id !== id), { id, termMonths, downPaymentCents }])
        }
        className="min-h-target rounded-pill bg-primary px-6 font-semibold text-white disabled:opacity-50"
      >
        {t(available ? 'cart.add' : 'cart.unavailable')}
      </button>
      {added ? (
        <Link
          href={`/${locale}/cart`}
          className="ml-4 inline-flex min-h-target items-center text-primary underline"
        >
          {t('cart.view')}
        </Link>
      ) : null}
    </div>
  );
}
