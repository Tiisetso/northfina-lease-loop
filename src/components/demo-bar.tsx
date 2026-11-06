'use client';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { setCart, type CartItem } from './cart-store';

export type DemoBarLabels = {
  badge: string;
  date: string;
  setDate: string;
  reset: string;
  active: string;
  persona: string;
  choosePersona: string;
  switchPersona: string;
  error: string;
  rateLimited: string;
};

/** Demo-mode controls: the date the app treats as today, and the persona to act as. */
export function DemoBar({
  labels,
  date,
  demoDateActive,
  min,
  max,
  personas,
  currentPersonaId,
}: {
  labels: DemoBarLabels;
  date: string;
  demoDateActive: boolean;
  min: string;
  max: string;
  personas: { id: string; label: string }[];
  currentPersonaId: string | null;
}) {
  const router = useRouter();
  const [chosenDate, setChosenDate] = useState(date);
  const [persona, setPersona] = useState(currentPersonaId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(path: string, body: unknown, onSuccess?: (data: unknown) => void) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) setError(response.status === 429 ? labels.rateLimited : labels.error);
      else {
        onSuccess?.(((await response.json()) as { data: unknown }).data);
        router.refresh();
      }
    } catch {
      setError(labels.error);
    } finally {
      setBusy(false);
    }
  }
  const submitDate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send('/api/demo/date', { date: chosenDate });
  };
  const submitPersona = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Each persona starts with its own scenario cart (often empty), never the previous one's.
    if (persona)
      void send('/api/demo/persona', { personaId: persona }, (data) =>
        setCart((data as { cart: CartItem[] }).cart)
      );
  };

  const control =
    'min-h-target rounded-sm border border-white/30 bg-white/10 px-2 text-caption text-on-dark';
  const button =
    'pressable min-h-target rounded-pill bg-white px-4 text-caption font-semibold text-ink disabled:opacity-60';
  return (
    <aside aria-label={labels.badge} className="bg-nav text-on-dark">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        <span className="rounded-pill bg-white/15 px-3 py-1 text-fine font-semibold uppercase">
          {labels.badge}
        </span>
        <form onSubmit={submitDate} className="flex flex-wrap items-center gap-2">
          <label htmlFor="demo-date" className="text-caption">
            {labels.date}
          </label>
          <input
            id="demo-date"
            type="date"
            required
            min={min}
            max={max}
            value={chosenDate}
            onChange={(event) => setChosenDate(event.target.value)}
            className={`${control} [color-scheme:dark]`}
          />
          <button type="submit" disabled={busy} className={button}>
            {labels.setDate}
          </button>
          {demoDateActive ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void send('/api/demo/date', { date: null })}
              className="min-h-target px-2 text-caption text-on-dark underline disabled:opacity-60"
            >
              {labels.reset}
            </button>
          ) : null}
        </form>
        <form onSubmit={submitPersona} className="flex flex-wrap items-center gap-2">
          <label htmlFor="demo-persona" className="text-caption">
            {labels.persona}
          </label>
          <select
            id="demo-persona"
            value={persona}
            onChange={(event) => setPersona(event.target.value)}
            className={`${control} max-w-64`}
          >
            <option value="" disabled className="text-ink">
              {labels.choosePersona}
            </option>
            {personas.map((item) => (
              <option key={item.id} value={item.id} className="text-ink">
                {item.label}
              </option>
            ))}
          </select>
          <button type="submit" disabled={busy || !persona} className={button}>
            {labels.switchPersona}
          </button>
        </form>
        <p className="text-fine text-body-muted" aria-live="polite">
          {error ?? (demoDateActive ? labels.active : null)}
        </p>
      </div>
    </aside>
  );
}
