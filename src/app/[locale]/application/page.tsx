import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ApplicationForm } from '@/components/application-form';
import { loadQuestions } from '@/data/load';
import { isLocale } from '@/i18n/locales';
import { readIdentity } from '@/server/auth-session';
import { checkoutOptions } from '@/server/checkout-options';
import { db } from '@/server/db';
import { todayIso } from '@/server/today';

export default async function Page({ params }: PageProps<'/[locale]/application'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const identity = await readIdentity(db, await headers());
  if (!identity) redirect(`/${locale}/login?next=application`);
  const [data, bank] = await Promise.all([checkoutOptions(todayIso()), loadQuestions()]);
  return (
    <ApplicationForm
      locale={locale}
      data={data}
      bank={bank}
      name={identity.name}
      email={identity.email}
    />
  );
}
