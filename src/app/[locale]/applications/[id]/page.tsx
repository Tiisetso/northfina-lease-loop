import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { formatEuro } from '@/domain/money';
import { getT, type MessageKey } from '@/i18n/get-t';
import { intlLocale, isLocale } from '@/i18n/locales';
import { applicationItemsSchema, findCustomerApplication } from '@/server/applications';
import { readIdentity } from '@/server/auth-session';
import { db } from '@/server/db';
import { todayIso } from '@/server/today';

export default async function Page({ params }: PageProps<'/[locale]/applications/[id]'>) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const identity = await readIdentity(db, await headers());
  if (!identity) redirect(`/${locale}/login`);
  const application = await findCustomerApplication(db, identity.customerId, id);
  if (!application) notFound();
  const t = getT(locale);
  const items = applicationItemsSchema.parse(JSON.parse(application.itemsJson));
  const reasons = z.array(z.string()).parse(JSON.parse(application.reasonsJson));
  const current = application.startDate === todayIso();
  return (
    <div className="mx-auto max-w-copy px-card py-section-compact">
      <h1 className="font-display text-display-sm font-semibold tablet:text-display-lg">
        {t(`application.status.${application.status}` as MessageKey)}
      </h1>
      <p className="mt-6 max-w-prose text-body text-ink-muted">
        {t(`application.outcome.${application.status}` as MessageKey)}
      </p>
      {reasons.length ? (
        <ul className="mt-6 list-disc space-y-3 pl-5">
          {reasons.map((reason) => (
            <li key={reason}>{t(`application.reason.${reason}` as MessageKey)}</li>
          ))}
        </ul>
      ) : null}
      <section className="mt-8 rounded-lg bg-parchment p-card">
        <h2 className="text-tagline font-semibold">{t('cart.summary')}</h2>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              {item.name} · {t('product.months', { count: item.termMonths })}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-caption">{t('cart.monthlyTotal')}</p>
        <p className="mt-2 text-lead font-semibold">
          {formatEuro(
            items.reduce((sum, item) => sum + item.monthlyTotalCents, 0),
            intlLocale[locale]
          )}
        </p>
      </section>
      <p className="mt-6 text-caption text-ink-muted">
        {t(current ? 'application.notice' : 'application.expired')}
      </p>
      <div className="mt-8 flex flex-wrap gap-6">
        {application.status === 'approved' && current ? (
          <Link
            href={`/${locale}/cart?application=${encodeURIComponent(id)}`}
            className="pressable inline-flex min-h-target items-center rounded-pill bg-primary px-6 py-3 text-on-dark"
          >
            {t('application.continue')}
          </Link>
        ) : null}
        <Link
          href={`/${locale}/application`}
          className="inline-flex min-h-target items-center text-primary"
        >
          {t('application.again')}
        </Link>
      </div>
    </div>
  );
}
