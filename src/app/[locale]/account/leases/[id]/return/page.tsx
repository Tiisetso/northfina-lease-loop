import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { ProductPhoto } from '@/components/product-photo';
import { ReturnRequestForm } from '@/components/return-request-form';
import { getT } from '@/i18n/get-t';
import { isLocale } from '@/i18n/locales';
import { readIdentity } from '@/server/auth-session';
import { db } from '@/server/db';
import { findCustomerLease } from '@/server/leases';
import { todayIso } from '@/server/today';

export default async function Page({ params }: PageProps<'/[locale]/account/leases/[id]/return'>) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const identity = await readIdentity(db, await headers());
  if (!identity) redirect(`/${locale}/login`);
  const lease = await findCustomerLease(db, identity.customerId, id);
  if (!lease) notFound();
  const t = getT(locale);
  return (
    <DashboardShell locale={locale} active="leases">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/${locale}/account/leases/${encodeURIComponent(id)}`}
          className="inline-flex min-h-target items-center text-caption text-primary"
        >
          ← {t('dashboard.viewLease')}
        </Link>
        <h2 className="mt-3 text-display-sm font-semibold">{t('return.title')}</h2>
        <p className="mt-3 text-body text-ink-muted">{t('return.intro')}</p>
        <div className="mt-6 flex items-center gap-4 rounded-lg bg-parchment p-4">
          <div className="w-20 shrink-0">
            <ProductPhoto
              assetId={lease.asset.id}
              productName={`${lease.asset.make} ${lease.asset.model}`}
              locale={locale}
              showCaption={false}
              sizes="80px"
            />
          </div>
          <p className="font-semibold">
            {lease.asset.make} {lease.asset.model}
          </p>
        </div>
        {lease.status === 'active' ? (
          <ReturnRequestForm
            locale={locale}
            contractId={id}
            category={lease.asset.category}
            condition={lease.asset.condition}
            usageValue={lease.asset.usage_value}
            usageUnit={lease.asset.usage_unit}
            today={todayIso()}
          />
        ) : (
          <p className="mt-6">{t('dashboard.requestUnavailable')}</p>
        )}
      </div>
    </DashboardShell>
  );
}
