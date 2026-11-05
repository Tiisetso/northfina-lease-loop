import Link from 'next/link';
import { getT } from '@/i18n/get-t';
import type { Locale } from '@/i18n/locales';

export type DashboardSection = 'overview' | 'leases' | 'payments' | 'requests' | 'settings';
export function DashboardShell({
  locale,
  active,
  children,
}: {
  locale: Locale;
  active: DashboardSection;
  children: React.ReactNode;
}) {
  const t = getT(locale);
  const links = [
    { id: 'overview', label: t('dashboard.overview'), href: `/${locale}/account` },
    { id: 'leases', label: t('dashboard.leases'), href: `/${locale}/account/leases` },
    { id: 'payments', label: t('dashboard.payments'), href: `/${locale}/account/payments` },
    { id: 'requests', label: t('dashboard.requests'), href: `/${locale}/account/requests` },
    { id: 'settings', label: t('dashboard.settings'), href: `/${locale}/account/settings` },
  ] as const;
  return (
    <div className="min-h-full bg-parchment text-ink">
      <div className="mx-auto max-w-content px-card py-section-compact tablet:py-section">
        <p className="text-caption font-semibold text-ink-muted">{t('brand.name')}</p>
        <h1 className="mt-2 font-display text-display-sm font-semibold tablet:text-display-lg">
          {t('dashboard.title')}
        </h1>
        <nav
          aria-label={t('dashboard.navigation')}
          className="mt-8 overflow-x-auto border-b border-hairline"
        >
          <ul className="flex min-w-max gap-2">
            {links.map((link) => (
              <li key={link.id}>
                <Link
                  href={link.href}
                  aria-current={active === link.id ? 'page' : undefined}
                  className={`flex min-h-target items-center border-b-2 px-3 text-caption ${active === link.id ? 'border-primary font-semibold text-ink' : 'border-transparent text-primary'}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
