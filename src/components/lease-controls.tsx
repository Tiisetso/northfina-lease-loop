'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { getT, type MessageKey } from '@/i18n/get-t';
import type { Locale } from '@/i18n/locales';
import type { RequestKind } from '@/domain/lease-insights';
import { authButtonClass } from './auth-field';

export function DemoLeaseButton({ locale }: { locale: Locale }) {
  const t = getT(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function create() {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch('/api/leases/demo', { method: 'POST' });
      if (!response.ok) {
        setError(true);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-6">
      <button type="button" disabled={busy} onClick={create} className={authButtonClass}>
        {t(busy ? 'auth.working' : 'dashboard.addDemo')}
      </button>
      <p className="mt-3 text-caption text-ink-muted">{t('dashboard.demoExplanation')}</p>
      {error ? (
        <p role="alert" className="mt-2 text-caption">
          {t('dashboard.demoError')}
        </p>
      ) : null}
    </div>
  );
}

export function LeaseRequestControls({
  locale,
  id,
  disabled,
}: {
  locale: Locale;
  id: string;
  disabled: boolean;
}) {
  const t = getT(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<MessageKey | null>(null);
  async function submit(kind: RequestKind) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/leases/${encodeURIComponent(id)}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      if (!response.ok) {
        setMessage(
          response.status === 409 ? 'dashboard.requestUnavailable' : 'dashboard.requestError'
        );
        return;
      }
      setMessage('dashboard.requestSent');
      router.refresh();
    } catch {
      setMessage('dashboard.requestError');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="mt-5 flex flex-wrap gap-3">
        {!disabled ? (
          <Link
            href={`/${locale}/account/leases/${encodeURIComponent(id)}/return`}
            className="pressable inline-flex min-h-target items-center rounded-pill bg-primary px-5 py-2 text-caption font-semibold text-white"
          >
            {t('dashboard.request.return')}
          </Link>
        ) : null}
        {(['buyout', 'exchange'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={busy || disabled}
            onClick={() => submit(kind)}
            className="pressable min-h-target rounded-pill border border-primary px-5 py-2 text-caption text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t(`dashboard.request.${kind}`)}
          </button>
        ))}
      </div>
      <p role="status" className="mt-3 text-caption">
        {message ? t(message) : disabled ? t('dashboard.requestUnavailable') : ''}
      </p>
    </div>
  );
}

export function ReturnQuoteAccept({
  locale,
  id,
  requestId,
  expectedAssessmentUpdatedAt,
  action = 'accept',
}: {
  locale: Locale;
  id: string;
  requestId: string;
  expectedAssessmentUpdatedAt: string;
  action?: 'accept' | 'buyout';
}) {
  const t = getT(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'quote' | 'payment' | null>(null);
  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/leases/${encodeURIComponent(id)}/return-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requestId, expectedAssessmentUpdatedAt }),
      });
      if (!response.ok) {
        const result = await response.json();
        setError(result.error?.code === 'PAYMENT_REQUIRED' ? 'payment' : 'quote');
        return;
      }
      router.refresh();
    } catch {
      setError('quote');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={busy}
        onClick={accept}
        className="pressable min-h-target rounded-pill bg-primary px-5 py-2 text-caption font-semibold text-white disabled:opacity-50"
      >
        {t(
          busy
            ? 'auth.working'
            : action === 'buyout'
              ? 'return.confirmBuyout'
              : 'return.acceptQuote'
        )}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-caption">
          {t(error === 'payment' ? 'return.paymentRequired' : 'return.acceptError')}
        </p>
      ) : null}
    </div>
  );
}
