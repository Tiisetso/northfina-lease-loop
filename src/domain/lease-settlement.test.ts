import { describe, expect, it } from 'vitest';
import { settlementQuote, type SettlementInput } from './lease-settlement';

const input: SettlementInput = {
  monthlyNetCents: 10730,
  buyoutCents: 58350,
  remainingMonths: 29,
  annualRateBasisPoints: 790,
  recoveryCents: 200000,
  vatBasisPoints: 2550,
  outstandingCents: 0,
};
const quote = (changes: Partial<SettlementInput> = {}) => settlementQuote({ ...input, ...changes });

describe('settlementQuote', () => {
  it('discounts future cash flows and applies the selected VAT to the settlement', () => {
    const result = quote();
    const rate = 0.079 / 12;
    const expected = Math.round(
      (10730 * (1 - (1 + rate) ** -29)) / rate + 58350 / (1 + rate) ** 29
    );
    expect(result.buyoutNetCents).toBe(expected);
    expect(result.buyoutNetCents).toBeLessThan(10730 * 29 + 58350);
    expect(result.returnNetCents).toBe(expected - 200000);
    expect(result.buyoutTotalCents).toBe(expected + Math.round(expected * 0.255));
    expect(result.policyVersion).toBe('settlement-v1');
  });

  it('handles zero interest and rounds half cents upwards', () => {
    expect(quote({ annualRateBasisPoints: 0, remainingMonths: 2 })).toMatchObject({
      buyoutNetCents: 79810,
      remainingRentNetCents: 21460,
      returnNetCents: 0,
    });
    expect(
      quote({
        monthlyNetCents: 1,
        buyoutCents: 0,
        remainingMonths: 1,
        annualRateBasisPoints: 0,
        vatBasisPoints: 5000,
      }).buyoutTotalCents
    ).toBe(2);
  });

  it('reaches the contractual buyout and ordinary zero-fee return at the agreed end', () => {
    expect(quote({ remainingMonths: 0, recoveryCents: 0, outstandingCents: 12345 })).toMatchObject({
      buyoutNetCents: 58350,
      buyoutTotalCents: 85574,
      returnNetCents: 0,
      returnTotalCents: 12345,
      remainingRentNetCents: 0,
    });
  });

  it('adds already-gross arrears exactly once without charging VAT to them again', () => {
    const without = quote();
    const withArrears = quote({ outstandingCents: 10001 });
    expect(withArrears.buyoutTotalCents - without.buyoutTotalCents).toBe(10001);
    expect(withArrears.returnTotalCents - without.returnTotalCents).toBe(10001);
  });

  it('floors return charges at zero and caps them at discounted remaining rents', () => {
    expect(quote({ recoveryCents: 999999 }).returnNetCents).toBe(0);
    const noRecovery = quote({ recoveryCents: 0 });
    expect(noRecovery.returnNetCents).toBe(noRecovery.remainingRentNetCents);
    expect(noRecovery.returnNetCents).toBeLessThan(noRecovery.buyoutNetCents);
  });

  it('reduces the buyout as fewer future payments remain without subtracting paid rent twice', () => {
    const amounts = Array.from(
      { length: 37 },
      (_, remainingMonths) => quote({ remainingMonths }).buyoutNetCents
    );
    expect(amounts[0]).toBe(input.buyoutCents);
    expect(amounts.every((amount, index) => index === 0 || amount >= amounts[index - 1]!)).toBe(
      true
    );
  });

  it.each([
    { monthlyNetCents: -1 },
    { buyoutCents: 0.5 },
    { remainingMonths: -1 },
    { remainingMonths: 121 },
    { annualRateBasisPoints: -1 },
    { annualRateBasisPoints: 100001 },
    { recoveryCents: -1 },
    { vatBasisPoints: -1 },
    { outstandingCents: 0.1 },
  ])('rejects invalid settlement facts: %j', (changes) =>
    expect(() => quote(changes)).toThrow(RangeError)
  );
});
