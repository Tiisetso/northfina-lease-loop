'use client';

import { useRouter } from 'next/navigation';
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
        {(['return', 'buyout', 'exchange'] as const).map((kind) => (
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
