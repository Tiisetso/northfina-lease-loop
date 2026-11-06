import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getT } from '@/i18n/get-t';
import { formatIsoDate } from '@/i18n/format';
import { isLocale } from '@/i18n/locales';
import { readIdentity } from '@/server/auth-session';
import { db } from '@/server/db';
import { listReturnCases } from '@/server/recovery';

export default async function Page({ params }: PageProps<'/[locale]/staff/returns'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const identity = await readIdentity(db, await headers());
  if (!identity) redirect(`/${locale}/login`);
  if (identity.role !== 'staff') notFound();
  const cases = await listReturnCases(db);
  const t = getT(locale);
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      <p className="text-caption font-semibold text-primary">{t('recovery.staff')}</p>
      <h1 className="mt-2 font-display text-display-sm font-semibold">{t('recovery.queue')}</h1>
      <p className="mt-3 max-w-2xl text-body text-ink-muted">{t('recovery.queueIntro')}</p>
      {!cases.length ? (
        <p className="mt-10 rounded-lg bg-parchment p-6">{t('recovery.empty')}</p>
      ) : (
        <ul className="mt-8 divide-y divide-hairline">
          {cases.map((request) => (
            <li key={request.id}>
              <Link
                href={`/${locale}/staff/returns/${request.id}`}
                className="flex min-h-target flex-wrap items-center justify-between gap-3 rounded-sm px-3 py-5 hover:bg-parchment"
              >
                <div>
                  <p className="font-semibold">
                    {request.contract.asset.make} {request.contract.asset.model}
                  </p>
                  <p className="mt-1 text-caption text-ink-muted">
                    {request.contract.customer.owner.name} ·{' '}
                    {t(`dashboard.request.${request.kind as 'return' | 'buyout'}`)} ·{' '}
                    {formatIsoDate(request.createdAt.toISOString().slice(0, 10), locale)}
                  </p>
                </div>
                <span className="rounded-pill bg-parchment px-3 py-1 text-caption">
                  {request.assessment
                    ? t(
                        `recovery.state.${request.assessment.status as 'quoted' | 'accepted' | 'received' | 'published' | 'retired' | 'bought'}`
                      )
                    : t('recovery.state.pending')}{' '}
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
