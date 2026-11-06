import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { headers } from 'next/headers';
import { readIdentity } from '@/server/auth-session';
import { findCustomerApplication } from '@/server/applications';
import { db } from '@/server/db';
import { CartPage } from '@/components/cart-page';
import { isLocale } from '@/i18n/locales';
import { checkoutOptions } from '@/server/checkout-options';
import { todayIso } from '@/server/today';

export default async function Page({ params, searchParams }: PageProps<'/[locale]/cart'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await connection();
  const query = await searchParams;
  const id = typeof query.application === 'string' ? query.application : undefined;
  const identity = id ? await readIdentity(db, await headers()) : null;
  const application =
    id && identity ? await findCustomerApplication(db, identity.customerId, id) : null;
  const today = todayIso();
  const applicationId =
    application?.status === 'approved' && application.startDate === today
      ? application.id
      : undefined;
  return (
    <CartPage
      key={applicationId ?? 'cart'}
      locale={locale}
      data={await checkoutOptions(today)}
      applicationId={applicationId}
    />
  );
}
