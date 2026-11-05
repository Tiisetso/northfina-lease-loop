'use client';

// Links to the same page in each language: /fi/anything → /en/anything.
// A client component only because it needs the current path.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { localeNames, locales, type Locale } from '@/i18n/locales';

export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const pathname = usePathname();
  const rest = pathname.split('/').slice(2).join('/');

  return (
    <nav aria-label={label}>
      <ul className="flex">
        {locales.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <Link
                href={rest ? `/${locale}/${rest}` : `/${locale}`}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? 'page' : undefined}
                className={
                  'pressable flex min-h-target min-w-target items-center justify-center rounded-sm text-fine uppercase ' +
                  (active
                    ? 'bg-ink text-on-dark underline decoration-primary-on-dark decoration-2 underline-offset-8'
                    : 'text-primary-on-dark')
                }
              >
                <span aria-hidden="true">{locale}</span>
                <span className="sr-only">{localeNames[locale]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
