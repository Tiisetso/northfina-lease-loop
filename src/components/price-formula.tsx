import { getT, type MessageKey } from '@/i18n/get-t';
import type { Locale } from '@/i18n/locales';
import type { SettlementInput } from '@/domain/lease-settlement';

export function PriceFormula({
  locale,
  kind,
  finance,
}: {
  locale: Locale;
  kind: 'buyout' | 'return';
  finance?: SettlementInput;
}) {
  const t = getT(locale);
  const symbols =
    kind === 'buyout'
      ? ['P', 'M', 'B', 'n', 'r', 'v', 'A']
      : ['T', 'O', 'a', 'c', 'u', 'V', 'N', 'R', 'B', 'E', 'D', 'v', 'A'];
  return (
    <details className="mt-6 border-t border-hairline pt-4">
      <summary className="inline-flex min-h-target cursor-pointer items-center gap-2 text-caption font-semibold text-primary">
        ƒ {t('customer.showFormula')}
      </summary>
      <div className="mt-4 rounded-lg bg-parchment p-5">
        <div
          dir="ltr"
          className="overflow-x-auto py-3 font-mono text-body leading-8"
          aria-label={t('customer.showFormula')}
        >
          {kind === 'buyout' ? (
            <p className="whitespace-nowrap">
              P = round(round(Σ<sub>k=1…n</sub> M / (1+r)<sup>k</sup> + B / (1+r)<sup>n</sup>) ×
              (1+v)) + A
            </p>
          ) : (
            <>
              <p className="whitespace-nowrap">V = round(O × a × c × u)</p>
              <p className="whitespace-nowrap">E = min(R, max(0, B − N))</p>
              <p className="whitespace-nowrap">T = round(max(E, D) × (1+v)) + A</p>
            </>
          )}
        </div>
        <p className="mt-3 text-fine text-ink-muted">{t('customer.formulaNote')}</p>
        <dl className="mt-4 grid gap-3 text-caption">
          {symbols.map((symbol) => (
            <div key={symbol} className="flex gap-3">
              <dt className="w-5 shrink-0 font-mono font-semibold">{symbol}</dt>
              <dd>
                {t(
                  `customer.var.${kind === 'return' && symbol === 'B' ? 'buyoutToday' : symbol}` as MessageKey
                )}
              </dd>
            </div>
          ))}
        </dl>
        {finance ? (
          <p className="mt-4 text-caption text-ink-muted">
            {t('customer.rateDetails', {
              rate: finance.annualRateBasisPoints / 100,
              months: finance.remainingMonths,
              vat: finance.vatBasisPoints / 100,
            })}
          </p>
        ) : null}
      </div>
    </details>
  );
}
