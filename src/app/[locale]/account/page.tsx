import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AccountSettings } from '@/components/account-settings';
import { getT } from '@/i18n/get-t';
import { isLocale } from '@/i18n/locales';
import { readIdentity } from '@/server/auth-session';
import { db } from '@/server/db';

export default async function AccountPage({ params }: PageProps<'/[locale]/account'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const identity = await readIdentity(db, await headers());
  if (!identity) redirect(`/${locale}/login`);
  const t = getT(locale);
  return (
    <div className="bg-parchment px-card py-section-compact text-ink tablet:py-section">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-display-sm font-semibold tablet:text-display-lg">
          {t('account.title')}
        </h1>
        <p className="mt-4 text-body">{t('account.welcome', { name: identity.name })}</p>
        <p className="mt-3 text-caption text-ink-muted wrap-anywhere">{identity.email}</p>
        {!identity.emailVerified ? (
          <p className="mt-2 text-caption text-ink-muted">{t('account.unverified')}</p>
        ) : null}
        <p className="mt-6 text-body text-ink-muted">{t('account.intro')}</p>
        <Link
          href={`/${locale}`}
          className="mt-4 inline-flex min-h-target items-center text-primary"
        >
          {t('auth.backToCatalogue')}
        </Link>
        <AccountSettings locale={locale} name={identity.name} />
      </div>
    </div>
  );
}
