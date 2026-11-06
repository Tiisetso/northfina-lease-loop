import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadAssets } from '@/data/load';
import { createTestDb } from '../../tests/helpers/test-db';
import { toAssetRowData } from './assets';
import { withAudit } from './audit';
import { createDemoLease } from './demo-lease';
import { requestLeaseChange } from './leases';
import { acceptReturn, assessReturn, progressReturn } from './recovery';
import { recoveryCalculationSchema } from './recovery-input';
import { completeRefurbishment, publishRelisting } from './relisting';
import { settlementQuote } from '@/domain/lease-settlement';

let fixture: Awaited<ReturnType<typeof createTestDb>>;
let contractId: string;
let requestId: string;
const today = '2026-11-06';
const inspection = {
  condition: 'fair' as const,
  targetCondition: 'good' as const,
  usageValue: 20000,
  ageMonths: 12,
  additionalRepairCents: 5000,
  notes: 'Brake pads and frame checked; listed faults included in repair quote.',
};
beforeEach(async () => {
  fixture = await createTestDb();
  const asset = (await loadAssets()).find((item) => item.id === 'ebike-005');
  if (!asset) throw new Error('Missing asset');
  await withAudit(
    fixture.db,
    { actor: 'test', action: 'test.setup', entityType: 'asset', entityId: asset.id },
    async (tx) => {
      await tx.asset.create({ data: toAssetRowData(asset) });
      await tx.user.createMany({
        data: [
          { id: 'staff', name: 'Inspector', email: 'inspector@example.com', role: 'staff' },
          { id: 'owner', name: 'Owner', email: 'owner@example.com' },
          { id: 'other', name: 'Other', email: 'other@example.com' },
        ],
      });
      await tx.customer.createMany({
        data: [
          { id: 'owner-customer', ownerUserId: 'owner' },
          { id: 'other-customer', ownerUserId: 'other' },
        ],
      });
    }
  );
  contractId = await createDemoLease(fixture.db, {
    customerId: 'owner-customer',
    userId: 'owner',
    today,
  });
  requestId = (
    await requestLeaseChange(fixture.db, {
      customerId: 'owner-customer',
      userId: 'owner',
      contractId,
      kind: 'return',
      report: {
        condition: 'fair',
        usageValue: 20000,
        issues: ['brakes_fault'],
        notes: 'Brake feels weak.',
      },
    })
  ).id;
});
afterEach(async () => {
  await fixture.cleanup();
});

describe('audited return lifecycle', () => {
  it('guards staff assessment, owner acceptance, quote changes and state transitions', async () => {
    await expect(
      assessReturn(fixture.db, { requestId, staffId: 'owner', today, inspection })
    ).rejects.toMatchObject({ status: 403 });
    const assessment = await assessReturn(fixture.db, {
      requestId,
      staffId: 'staff',
      today,
      inspection,
    });
    const initialQuote = recoveryCalculationSchema.parse(JSON.parse(assessment.calculationJson));
    const contract = await fixture.db.contract.findUniqueOrThrow({ where: { id: contractId } });
    // The first demo invoice was issued and paid: discount only the other 35 rents.
    expect(initialQuote.outstandingInvoiceCents).toBe(0);
    expect(initialQuote.accruedUnissuedCents).toBe(0);
    expect(initialQuote.settlement.buyoutNetCents).toBe(
      settlementQuote({
        monthlyNetCents: contract.monthlyNetCents,
        buyoutCents: contract.buyoutCents,
        remainingMonths: 35,
        annualRateBasisPoints: initialQuote.annualRateBasisPoints,
        recoveryCents: initialQuote.recovery.netRecoveryCents,
        vatBasisPoints: initialQuote.vatBasisPoints,
        outstandingCents: 0,
      }).buyoutNetCents
    );
    const publish = (expectedPriceCents: number) =>
      publishRelisting(fixture.db, { requestId, staffId: 'staff', today, expectedPriceCents });
    await expect(publish(initialQuote.recovery.postRepairValueCents)).rejects.toMatchObject({
      status: 409,
    });
    const accept = {
      requestId,
      contractId,
      customerId: 'owner-customer',
      userId: 'owner',
      today,
      action: 'accept' as const,
      expectedAssessmentUpdatedAt: assessment.updatedAt.toISOString(),
    };
    await expect(
      acceptReturn(fixture.db, { ...accept, customerId: 'other-customer', userId: 'other' })
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      acceptReturn(fixture.db, {
        ...accept,
        expectedAssessmentUpdatedAt: '2000-01-01T00:00:00.000Z',
      })
    ).rejects.toMatchObject({ status: 409 });
    await acceptReturn(fixture.db, accept);
    await progressReturn(fixture.db, { requestId, staffId: 'staff', today, action: 'receive' });
    await expect(
      progressReturn(fixture.db, { requestId, staffId: 'staff', today, action: 'receive' })
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await fixture.db.contract.findUniqueOrThrow({ where: { id: contractId } })).status
    ).toBe('returned');
    expect((await fixture.db.asset.findUniqueOrThrow({ where: { id: 'ebike-005' } })).status).toBe(
      'returned'
    );
    await completeRefurbishment(fixture.db, {
      requestId,
      staffId: 'staff',
      work: {
        completedWork: initialQuote.recovery.workItems.map((item) => item.id),
        retestedChecks: [],
        sanitization: null,
        notes: '',
      },
    });
    const result = await publish(initialQuote.recovery.postRepairValueCents);
    const snapshot = recoveryCalculationSchema.parse(JSON.parse(result.calculationJson));
    const asset = await fixture.db.asset.findUniqueOrThrow({ where: { id: 'ebike-005' } });
    expect(asset).toMatchObject({
      status: 'available',
      condition: 'good',
      usage_value: 20000,
      maintenanceUsageValue: 20000,
      priceRevision: 2,
      secondLifePriceCents: snapshot.recovery.postRepairValueCents,
    });
    expect(asset.originalPriceCents).toBeGreaterThan(0);
    expect(asset.firstLeaseDate).toBe('2025-11-06');
    expect(result).toMatchObject({
      status: 'published',
      publishedPriceCents: snapshot.recovery.postRepairValueCents,
    });
    expect(
      (await fixture.db.contract.findUniqueOrThrow({ where: { id: contractId } })).endedOn
    ).toBe(today);
    expect(await fixture.db.auditLog.count({ where: { action: 'return.publish' } })).toBe(1);
  });
  it('preserves the accepted quote and can retire instead of publishing', async () => {
    const assessment = await assessReturn(fixture.db, {
      requestId,
      staffId: 'staff',
      today,
      inspection,
    });
    await acceptReturn(fixture.db, {
      requestId,
      contractId,
      customerId: 'owner-customer',
      userId: 'owner',
      today,
      action: 'accept',
      expectedAssessmentUpdatedAt: assessment.updatedAt.toISOString(),
    });
    await expect(
      assessReturn(fixture.db, { requestId, staffId: 'staff', today, inspection })
    ).rejects.toMatchObject({ status: 409 });
    await progressReturn(fixture.db, { requestId, staffId: 'staff', today, action: 'receive' });
    await progressReturn(fixture.db, { requestId, staffId: 'staff', today, action: 'retire' });
    await expect(
      publishRelisting(fixture.db, { requestId, staffId: 'staff', today, expectedPriceCents: 1 })
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await fixture.db.asset.findUniqueOrThrow({ where: { id: 'ebike-005' } }))
        .secondLifePriceCents
    ).toBeNull();
  });
});
