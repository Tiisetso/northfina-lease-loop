import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { CartPage } from '@/components/cart-page';
import { isLocale } from '@/i18n/locales';
import { checkoutOptions } from '@/server/checkout-options';
import { todayIso } from '@/server/today';

export default async function Page({ params }: PageProps<'/[locale]/cart'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await connection();
  return <CartPage locale={locale} data={await checkoutOptions(todayIso())} />;
}
