'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AssetCategory } from '@/data/schemas';
import type { RelistOffer } from '@/domain/relist-offer';
import { invoiceAmounts } from '@/domain/lease-billing';
import { formatEuro } from '@/domain/money';
import { getT, type MessageKey } from '@/i18n/get-t';
import { intlLocale, type Locale } from '@/i18n/locales';
import type {
  RecoveryCalculation,
  RecoveryInspection,
  RecoveryReport,
} from '@/server/recovery-input';
import { InspectionForm, primaryButtonClass } from './inspection-form';
import { InspectionSummary } from './inspection-summary';
import { RefurbishmentSignoff } from './refurbishment-signoff';
import { RelistPanel } from './relist-panel';

type Props = {
  locale: Locale;
  requestId: string;
  assetId: string;
  itemName: string;
  category: AssetCategory;
  report: RecoveryReport | null;
  inspection: RecoveryInspection | null;
  calculation: RecoveryCalculation | null;
  status: string;
  currentUsage: number;
  recordedAge: number | null;
  defaultAge: number;
  vatBasisPoints: number;
  offer: RelistOffer | null;
  publishedPriceCents: number | null;
};

export function RecoveryWorkbench({
  locale,
  requestId,
  assetId,
  itemName,
  category,
  report,
  inspection,
  calculation,
  status,
  currentUsage,
  recordedAge,
  defaultAge,
  vatBasisPoints,
  offer,
  publishedPriceCents,
}: Props) {
  const t = getT(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<'general' | 'price' | null>(null);
  const currency = (cents: number) => formatEuro(cents, intlLocale[locale]);
  const quoteGross = (cents: number) =>
    invoiceAmounts(Math.max(0, cents), calculation?.vatBasisPoints ?? vatBasisPoints).totalCents;
  const todayGross = (cents: number) =>
    invoiceAmounts(Math.max(0, cents), vatBasisPoints).totalCents;

  async function send(body: unknown) {
    setBusy(true);
    setFailure(null);
    try {
      const response = await fetch(`/api/staff/returns/${encodeURIComponent(requestId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const code = (payload as { error?: { code?: string } } | null)?.error?.code;
        setFailure(code === 'PRICE_CHANGED' ? 'price' : 'general');
        // The panel must now show the price staff are actually being asked to accept.
        if (code === 'PRICE_CHANGED') router.refresh();
        return;
      }
      router.refresh();
    } catch {
      setFailure('general');
    } finally {
      setBusy(false);
    }
  }

  const canAssess = status === 'pending' || status === 'quoted';
  const priceNet = publishedPriceCents ?? offer?.priceNetCents ?? null;
  return (
    <div className="mt-8 grid items-start gap-8 desktop:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-8">
        <section className="rounded-lg bg-parchment p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-tagline font-semibold">{t('recovery.report')}</h2>
            <span className="rounded-pill bg-canvas px-3 py-1 text-caption">
              {t(`recovery.state.${status}` as MessageKey)}
            </span>
          </div>
          {report ? (
            <>
              <dl className="mt-5 grid grid-cols-2 gap-4">
                <Fact label={t('condition.label')} value={t(`condition.${report.condition}`)} />
                <Fact label={t(`product.usage.${category}`)} value={String(report.usageValue)} />
              </dl>
              <ul className="mt-5 space-y-2 text-caption">
                {report.issues.map((issue) => (
                  <li key={issue}>• {t(`return.issue.${issue}` as MessageKey)}</li>
                ))}
              </ul>
              {report.notes ? (
                <p className="mt-5 whitespace-pre-wrap text-body">{report.notes}</p>
              ) : null}
              {report.preferredDate ? (
                <p className="mt-3 text-caption">
                  {t('return.preferredDate')}: {report.preferredDate}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-4 text-caption text-ink-muted">{t('recovery.noReport')}</p>
          )}
        </section>

        {canAssess ? (
          <InspectionForm
            locale={locale}
            category={category}
            reportedIssues={report?.issues ?? []}
            reportedCondition={report?.condition ?? null}
            reportedUsage={report?.usageValue ?? null}
            inspection={inspection}
            currentUsage={currentUsage}
            recordedAge={recordedAge}
            defaultAge={defaultAge}
            vatBasisPoints={vatBasisPoints}
            busy={busy}
            failed={failure === 'general'}
            onSubmit={(body) => void send(body)}
          />
        ) : null}

        {status === 'received' && calculation ? (
          <RefurbishmentSignoff
            locale={locale}
            category={category}
            workItems={calculation.recovery.workItems}
            record={inspection?.record}
            busy={busy}
            failed={failure === 'general'}
            onSubmit={(body) => void send(body)}
          />
        ) : null}

        {!canAssess && inspection?.record ? (
          <InspectionSummary
            locale={locale}
            category={category}
            record={inspection.record}
            notes={inspection.notes}
            currency={(net) => currency(quoteGross(net))}
          />
        ) : null}

        {calculation ? (
          <section className="rounded-lg border border-hairline p-6">
            <h2 className="text-tagline font-semibold">{t('recovery.work')}</h2>
            <ul className="mt-5 divide-y divide-divider">
              {calculation.recovery.workItems.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3 text-caption">
                  <span>{t(`recovery.task.${item.id}` as MessageKey)}</span>
                  <strong className="shrink-0">{currency(quoteGross(item.costCents))}</strong>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-caption text-ink-muted">{t('pricing.includesVat')}</p>
          </section>
        ) : null}
      </div>

      <aside className="rounded-lg bg-parchment p-6">
        <h2 className="text-tagline font-semibold">{t('recovery.numbers')}</h2>
        {calculation ? (
          <>
            <p className="mt-5 text-caption text-ink-muted">
              {t(
                status === 'published'
                  ? 'relist.listedAt'
                  : priceNet !== null
                    ? 'relist.priceToday'
                    : 'recovery.nextPrice'
              )}
            </p>
            <p className="mt-2 font-display text-display-lg font-semibold">
              {currency(
                priceNet !== null
                  ? todayGross(priceNet)
                  : quoteGross(calculation.recovery.postRepairValueCents)
              )}
            </p>
            <p className="mt-1 text-caption text-ink-muted">{t('pricing.includesVat')}</p>
            {status === 'published' ? (
              <Link
                href={`/${locale}/products/${assetId}`}
                className="mt-3 inline-flex min-h-target items-center text-caption text-primary"
              >
                {t('relist.viewListing')}
              </Link>
            ) : null}
            {status === 'ready' && offer ? (
              <RelistPanel
                key={offer.priceNetCents}
                locale={locale}
                itemName={itemName}
                offer={offer}
                vatBasisPoints={vatBasisPoints}
                busy={busy}
                priceChanged={failure === 'price'}
                onPublish={(expectedPriceCents) =>
                  void send({ action: 'publish', expectedPriceCents })
                }
                onRetire={() => void send({ action: 'retire' })}
              />
            ) : null}
            <dl className="mt-6 space-y-5">
              <Fact
                label={t('recovery.originalPrice')}
                value={currency(quoteGross(calculation.originalPriceCents))}
              />
              <Fact label={t('recovery.ageMonths')} value={String(calculation.ageMonths)} />
              <Fact
                label={t('recovery.returnedValue')}
                value={currency(quoteGross(calculation.recovery.asReturnedValueCents))}
              />
              <Fact
                label={t('recovery.refurbCost')}
                value={currency(quoteGross(calculation.recovery.refurbishmentCostCents))}
              />
              <Fact
                label={t('recovery.returnSettlement')}
                value={currency(calculation.settlement.returnTotalCents)}
              />
              <Fact
                label={t('recovery.buyoutQuote')}
                value={currency(calculation.settlement.buyoutTotalCents)}
              />
            </dl>
            <p className="mt-5 text-caption text-ink-muted">{t('recovery.quoteNote')}</p>
            {status === 'quoted' ? (
              <p className="mt-5 rounded-sm bg-canvas p-4 text-caption">
                {t('recovery.awaitCustomer')}
              </p>
            ) : null}
            {status === 'accepted' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void send({ action: 'receive' })}
                className={`${primaryButtonClass} mt-6 w-full`}
              >
                {t('recovery.receive')}
              </button>
            ) : null}
            {status === 'received' ? (
              <>
                <p className="mt-5 rounded-sm bg-canvas p-4 text-caption">
                  {t('signoff.awaiting')}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ action: 'retire' })}
                  className="mt-3 min-h-target w-full text-caption text-primary underline"
                >
                  {t('recovery.retire')}
                </button>
              </>
            ) : null}
          </>
        ) : (
          <p className="mt-5 text-body text-ink-muted">{t('recovery.beforeQuote')}</p>
        )}
        {failure === 'general' && !canAssess && status !== 'received' ? (
          <p
            role="alert"
            className="mt-5 rounded-sm border border-hairline bg-canvas p-4 text-caption"
          >
            {t('recovery.error')}
          </p>
        ) : null}
      </aside>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
