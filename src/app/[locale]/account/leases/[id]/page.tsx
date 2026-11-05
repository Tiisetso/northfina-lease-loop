import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { LeaseDetail } from '@/components/lease-detail';
import { loadCo2Factors, loadVatRates } from '@/data/load';
import { isLocale } from '@/i18n/locales';
import { getT } from '@/i18n/get-t';
import { readIdentity } from '@/server/auth-session';
import { db } from '@/server/db';
import { findCustomerLease } from '@/server/leases';
import { todayIso } from '@/server/today';

export default async function LeaseDetailPage({
  params,
}: PageProps<'/[locale]/account/leases/[id]'>) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const identity = await readIdentity(db, await headers());
  if (!identity) redirect(`/${locale}/login`);
  const lease = await findCustomerLease(db, identity.customerId, id);
  if (!lease) notFound();
  const [vat, factors] = await Promise.all([loadVatRates(), loadCo2Factors()]);
  const t = getT(locale);
  return (
    <DashboardShell locale={locale} active="leases">
      <Link
        href={`/${locale}/account/leases`}
        className="inline-flex min-h-target items-center text-primary"
      >
        ← {t('dashboard.leases')}
      </Link>
      <LeaseDetail
        locale={locale}
        lease={lease}
        rates={vat.rates}
        factors={factors}
        today={todayIso()}
      />
    </DashboardShell>
  );
}
