import Link from 'next/link';
import { loadVatRates } from '@/data/load';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { RecoveryWorkbench } from '@/components/recovery-workbench';
import { recoveryAgeMonths } from '@/domain/asset-recovery';
import { getT } from '@/i18n/get-t';
import { isLocale } from '@/i18n/locales';
import { readIdentity } from '@/server/auth-session';
import { db } from '@/server/db';
import { findReturnCase } from '@/server/recovery';
import {
  inspectionSchema,
  recoveryCalculationSchema,
  recoveryReportSchema,
} from '@/server/recovery-input';
import { relistOfferFor } from '@/server/relisting';
import { todayIso } from '@/server/today';

export default async function Page({ params }: PageProps<'/[locale]/staff/returns/[id]'>) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const identity = await readIdentity(db, await headers());
  if (!identity) redirect(`/${locale}/login`);
  if (identity.role !== 'staff') notFound();
  const request = await findReturnCase(db, id);
  if (!request) notFound();
  const report = request.customerReportJson
    ? recoveryReportSchema.parse(JSON.parse(request.customerReportJson))
    : null;
  const inspection = request.assessment
    ? inspectionSchema.parse(JSON.parse(request.assessment.inspectionJson))
    : null;
  const calculation = request.assessment
    ? recoveryCalculationSchema.parse(JSON.parse(request.assessment.calculationJson))
    : null;
  const firstDate = request.contract.asset.firstLeaseDate ?? request.contract.startDate;
  const vat = await loadVatRates();
  const rate = vat.rates.find(
    (rate) =>
      rate.valid_from <= todayIso() && (rate.valid_to === null || rate.valid_to >= todayIso())
  );
  const vatBasisPoints = rate ? Math.round(rate.rate_percent * 100) : 0;
  const status = request.assessment?.status ?? 'pending';
  const offer = ['received', 'ready'].includes(status)
    ? await relistOfferFor(db, id, todayIso()).catch(() => null)
    : null;
  const t = getT(locale);
  const itemName = `${request.contract.asset.make} ${request.contract.asset.model}`;
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      <Link
        href={`/${locale}/staff/returns`}
        className="inline-flex min-h-target items-center text-caption text-primary"
      >
        ← {t('recovery.queue')}
      </Link>
      <p className="mt-4 text-caption font-semibold text-primary">{t('recovery.staff')}</p>
      <h1 className="mt-2 font-display text-display-sm font-semibold">{itemName}</h1>
      <p className="mt-3 text-caption text-ink-muted">
        {request.contract.customer.owner.name} · {request.contract.asset.serial_number}
      </p>
      <RecoveryWorkbench
        key={request.assessment?.updatedAt.toISOString() ?? 'new'}
        vatBasisPoints={vatBasisPoints}
        locale={locale}
        requestId={id}
        assetId={request.contract.asset.id}
        itemName={itemName}
        offer={offer}
        publishedPriceCents={request.assessment?.publishedPriceCents ?? null}
        category={request.contract.asset.category as 'e_bike' | 'laptop' | 'farm_machine'}
        report={report}
        inspection={inspection}
        calculation={calculation}
        status={status}
        currentUsage={request.contract.asset.usage_value}
        recordedAge={
          request.contract.asset.firstLeaseDate ? recoveryAgeMonths(firstDate, todayIso()) : null
        }
        defaultAge={recoveryAgeMonths(firstDate, todayIso())}
      />
    </div>
  );
}
