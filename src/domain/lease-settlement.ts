import { invoiceAmounts } from './lease-billing';

export type SettlementInput = {
  monthlyNetCents: number;
  buyoutCents: number;
  remainingMonths: number;
  annualRateBasisPoints: number;
  recoveryCents: number;
  vatBasisPoints: number;
  /** Already-gross unpaid issued invoices; never apply VAT to this a second time. */
  outstandingCents: number;
};

function roundedCents(numerator: bigint, denominator: bigint) {
  const result = Number((numerator + denominator / 2n) / denominator);
  if (!Number.isSafeInteger(result) || result < 0)
    throw new RangeError('Settlement exceeds safe cents');
  return result;
}

/** Annual nominal basis points / 12 gives the monthly discount rate, represented as an exact rational. */
export function settlementQuote(input: SettlementInput) {
  if (
    !Object.values(input).every((value) => Number.isSafeInteger(value) && value >= 0) ||
    input.remainingMonths > 120 ||
    input.annualRateBasisPoints > 100_000
  )
    throw new RangeError('Invalid settlement facts');
  const months = BigInt(input.remainingMonths);
  const monthly = BigInt(input.monthlyNetCents);
  const buyout = BigInt(input.buyoutCents);
  let buyoutNetCents: number;
  let remainingRentNetCents: number;
  if (input.annualRateBasisPoints === 0 || months === 0n) {
    remainingRentNetCents = roundedCents(monthly * months, 1n);
    buyoutNetCents = roundedCents(monthly * months + buyout, 1n);
  } else {
    const rate = BigInt(input.annualRateBasisPoints);
    const base = 120_000n;
    const discounted = (base + rate) ** months;
    const undiscounted = base ** months;
    const rentNumerator = monthly * base * (discounted - undiscounted);
    const denominator = rate * discounted;
    // Both amounts are rounded once, half up, at their final net-cent boundaries.
    remainingRentNetCents = roundedCents(rentNumerator, denominator);
    buyoutNetCents = roundedCents(rentNumerator + buyout * rate * undiscounted, denominator);
  }
  // At the agreed end, returning the asset does not make the customer liable for its residual value.
  const returnNetCents =
    input.remainingMonths === 0
      ? 0
      : Math.min(remainingRentNetCents, Math.max(0, buyoutNetCents - input.recoveryCents));
  // This demo treats settlement charges at the selected standard rate; it is a versioned commercial policy.
  const buyoutTotalCents =
    invoiceAmounts(buyoutNetCents, input.vatBasisPoints).totalCents + input.outstandingCents;
  const returnTotalCents =
    invoiceAmounts(returnNetCents, input.vatBasisPoints).totalCents + input.outstandingCents;
  if (![buyoutTotalCents, returnTotalCents].every(Number.isSafeInteger))
    throw new RangeError('Settlement exceeds safe cents');
  return {
    buyoutNetCents,
    buyoutTotalCents,
    returnNetCents,
    returnTotalCents,
    remainingRentNetCents,
    policyVersion: 'settlement-v1' as const,
  };
}
