// The root layout. Every page lives under /[locale] (/en, /fi, /sv, /et), so the
// <html lang> attribute is always right for the page.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { AccountNavigation } from '@/components/account-navigation';
import { UiIcon } from '@/components/ui-icon';
import { getT } from '@/i18n/get-t';
import { isLocale } from '@/i18n/locales';
import { readIdentity } from '@/server/auth-session';
import { db } from '@/server/db';
import '../globals.css';

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getT(locale);
  return { title: t('meta.title'), description: t('meta.description') };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const identity = await readIdentity(db, await headers());

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col bg-canvas font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:flex focus:min-h-target focus:items-center focus:rounded-sm focus:bg-canvas focus:px-4 focus:text-primary"
        >
          {t('nav.skipToContent')}
        </a>

        <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/95 backdrop-blur-xl">
          <div>
            <div className="mx-auto flex min-h-18 max-w-[1200px] items-center justify-between gap-x-3 px-4 sm:px-6">
              <Link
                href={`/${locale}`}
                className="pressable flex min-h-target items-center gap-2.5 rounded-sm text-primary"
              >
                <LoopMark />
                <span className="sr-only text-body font-semibold tracking-tight text-ink min-[23rem]:not-sr-only">
                  {t('brand.name')}
                </span>
              </Link>
              <AccountNavigation
                locale={locale}
                accountLabel={t('nav.account')}
                languageLabel={t('nav.language')}
                staff={identity?.role === 'staff'}
              />
            </div>
          </div>
          <nav aria-label={t('nav.categories')} className="border-t border-divider">
            <div className="mx-auto flex max-w-[1200px] items-center gap-1 overflow-x-auto px-4 py-1 sm:gap-4 sm:px-6">
              {(
                [
                  ['e_bike', 'bike'],
                  ['laptop', 'laptop'],
                  ['farm_machine', 'tractor'],
                ] as const
              ).map(([category, icon]) => (
                <Link
                  key={category}
                  href={`/${locale}#category-${category}`}
                  className="flex min-h-target shrink-0 items-center gap-2 rounded-pill px-3 text-caption text-ink-muted hover:bg-parchment hover:text-ink focus-visible:bg-parchment"
                >
                  <UiIcon name={icon} className="size-4" />
                  {t(`category.${category}`)}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        <main id="main" tabIndex={-1} className="flex-1">
          {children}
        </main>

        {identity?.role === 'staff' ? (
          <Link
            href={`/${locale}/staff/returns`}
            className="pressable fixed right-5 bottom-5 z-40 inline-flex min-h-target items-center gap-2 rounded-pill border border-hairline bg-ink px-5 py-3 text-caption font-semibold text-white shadow-lg"
          >
            <UiIcon name="settings" className="size-4" />
            {t('flow.admin')}
          </Link>
        ) : null}
        <footer className="bg-parchment text-ink-muted">
          <div className="mx-auto max-w-content px-card py-16">
            <p className="text-caption font-semibold">{t('brand.name')}</p>
            <p className="mt-3 max-w-copy text-caption">{t('brand.tagline')}</p>
            <p className="mt-8 border-t border-hairline pt-6 text-fine">{t('footer.skeleton')}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

/** Two arrows chasing each other: lease, return, lease again. */
function LoopMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className="size-7 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 13a9 9 0 0 1 15.5-4.5L26 11" />
      <path d="M26 5v6h-6" />
      <path d="M24 19a9 9 0 0 1-15.5 4.5L6 21" />
      <path d="M6 27v-6h6" />
    </svg>
  );
}
