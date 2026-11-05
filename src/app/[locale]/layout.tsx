// The root layout. Every page lives under /[locale] (/en, /fi, /sv, /et), so the
// <html lang> attribute is always right for the page.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccountNavigation } from '@/components/account-navigation';
import { getT } from '@/i18n/get-t';
import { isLocale } from '@/i18n/locales';
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

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col bg-canvas font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:flex focus:min-h-target focus:items-center focus:rounded-sm focus:bg-canvas focus:px-4 focus:text-primary"
        >
          {t('nav.skipToContent')}
        </a>

        <header className="sticky top-0 z-20">
          <div className="bg-nav text-on-dark">
            <div className="mx-auto flex min-h-target max-w-content flex-wrap items-center justify-between gap-x-3 px-card">
              <Link
                href={`/${locale}`}
                className="pressable flex min-h-target items-center gap-2 rounded-sm text-primary-on-dark"
              >
                <LoopMark />
                <span className="sr-only text-caption font-semibold phone:not-sr-only">
                  {t('brand.name')}
                </span>
              </Link>
              <AccountNavigation
                locale={locale}
                accountLabel={t('nav.account')}
                languageLabel={t('nav.language')}
              />
            </div>
          </div>
          <div className="border-b border-hairline bg-parchment/80 backdrop-blur-[20px] backdrop-saturate-180">
            <div className="mx-auto flex min-h-13 max-w-content items-center justify-between gap-6 px-card py-3">
              <p className="font-display text-tagline font-semibold">{t('catalogue.title')}</p>
              <p className="hidden text-caption text-ink-muted tablet:block">
                {t('brand.tagline')}
              </p>
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1">
          {children}
        </main>

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
