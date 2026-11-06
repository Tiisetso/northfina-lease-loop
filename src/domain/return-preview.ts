import type { AssetCondition, RefurbishmentCosts, ResidualCurves } from '@/data/schemas';
import { assetRecovery, type RecoveryInput } from './asset-recovery';
import { conditionReport, type ConditionAnswers } from './condition-report';
import { invoiceAmounts } from './lease-billing';
import { settlementQuote, type SettlementInput } from './lease-settlement';
export type ReturnPreviewContext = {
  baselineCondition: AssetCondition;
  recoveryFacts: Pick<
    RecoveryInput,
    'category' | 'originalPriceCents' | 'ageMonths' | 'maintenanceUsageValue'
  >;
  finance: SettlementInput;
  costs: RefurbishmentCosts;
  curves: ResidualCurves;
};
export function returnPreview(
  data: ReturnPreviewContext,
  answers: ConditionAnswers,
  usageValue: number
) {
  const report = conditionReport(
    data.recoveryFacts.category,
    data.baselineCondition,
    answers,
    data.costs
  );
  const condition = report.condition === 'new' ? 'like_new' : report.condition;
  const recovery = assetRecovery(
    {
      ...data.recoveryFacts,
      condition,
      targetCondition: condition === 'like_new' ? 'like_new' : 'good',
      usageValue,
      additionalRepairCents: 0,
    },
    data.curves,
    data.costs
  );
  const quote = settlementQuote({
    ...data.finance,
    recoveryCents: recovery.netRecoveryCents,
    damageCents: report.damageNetCents,
  });
  return {
    ...report,
    itemValueTotalCents: invoiceAmounts(recovery.asReturnedValueCents, data.finance.vatBasisPoints)
      .totalCents,
    damageTotalCents: invoiceAmounts(report.damageNetCents, data.finance.vatBasisPoints).totalCents,
    returnTotalCents: quote.returnTotalCents,
  };
}
