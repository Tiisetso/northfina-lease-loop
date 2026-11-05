import Link from 'next/link';
import type { Locale } from '@/i18n/locales';
import { LanguageSwitcher } from './language-switcher';

export function AccountNavigation({
  locale,
  accountLabel,
  languageLabel,
}: {
  locale: Locale;
  accountLabel: string;
  languageLabel: string;
}) {
  return (
    <div className="flex items-center">
      <Link
        href={`/${locale}/account`}
        aria-label={accountLabel}
        className="pressable flex min-h-target min-w-target items-center justify-center rounded-sm text-primary-on-dark"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-5"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2" />
        </svg>
      </Link>
      <LanguageSwitcher current={locale} label={languageLabel} />
    </div>
  );
}
