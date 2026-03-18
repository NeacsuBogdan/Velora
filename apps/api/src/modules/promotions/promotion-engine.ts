import type { PromotionFundingSource, PromotionRuleConfiguration } from "@velora/contracts";
import type { PromotionStackingMode, PromotionType } from "@prisma/client";

export interface PricingLine {
  listingId: string;
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  categorySlug: string | null;
  categoryPath: string[];
}

export interface PricingPromotionCandidate {
  promotionId: string;
  name: string;
  description: string;
  type: PromotionType;
  fundingSource: PromotionFundingSource;
  sellerFundingSharePercent: number | null;
  stackingMode: PromotionStackingMode;
  priority: number;
  couponCode: string | null;
  configuration: PromotionRuleConfiguration;
}

export interface AppliedDiscountAllocation {
  listingId: string;
  amount: number;
}

export interface AppliedDiscountResult {
  promotionId: string | null;
  couponCode: string | null;
  label: string;
  description: string | null;
  amount: number;
  fundingSource: PromotionFundingSource;
  sellerFundedAmount: number;
  platformFundedAmount: number;
  allocations: AppliedDiscountAllocation[];
}

export interface PricingEvaluationResult {
  subtotal: number;
  discountTotal: number;
  total: number;
  discounts: AppliedDiscountResult[];
}

interface EvaluatedPromotion extends AppliedDiscountResult {
  priority: number;
  stackingMode: PromotionStackingMode;
}

export interface PricingEvaluationInput {
  currency: string;
  couponCode: string | null;
  lines: PricingLine[];
  promotions: PricingPromotionCandidate[];
}

type LineTotals = Map<string, number>;

export function evaluatePromotions(
  input: PricingEvaluationInput
): PricingEvaluationResult {
  const normalizedCouponCode = normalizeCouponCode(input.couponCode);
  const subtotal = input.lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );
  const workingTotals = new Map(
    input.lines.map((line) => [line.listingId, line.unitPrice * line.quantity])
  );
  const eligiblePromotions = input.promotions
    .map((promotion) =>
      evaluatePromotion(
        promotion,
        input.lines,
        workingTotals,
        subtotal,
        normalizedCouponCode
      )
    )
    .filter((promotion): promotion is EvaluatedPromotion => promotion !== null)
    .sort(comparePromotions);
  const exclusivePromotion = eligiblePromotions.find(
    (promotion) => promotion.stackingMode === "EXCLUSIVE"
  );
  const selectedPromotions = exclusivePromotion
    ? [input.promotions.find((promotion) => promotion.promotionId === exclusivePromotion.promotionId)!]
    : eligiblePromotions.map((promotion) =>
        input.promotions.find(
          (candidate) => candidate.promotionId === promotion.promotionId
        )!
      );

  const discounts: AppliedDiscountResult[] = [];
  let discountTotal = 0;

  for (const promotion of selectedPromotions) {
    const evaluatedPromotion = evaluatePromotion(
      promotion,
      input.lines,
      workingTotals,
      subtotal,
      normalizedCouponCode
    );

    if (!evaluatedPromotion || evaluatedPromotion.amount <= 0) {
      continue;
    }

    discounts.push({
      promotionId: evaluatedPromotion.promotionId,
      couponCode: evaluatedPromotion.couponCode,
      label: evaluatedPromotion.label,
      description: evaluatedPromotion.description,
      amount: evaluatedPromotion.amount,
      fundingSource: evaluatedPromotion.fundingSource,
      sellerFundedAmount: evaluatedPromotion.sellerFundedAmount,
      platformFundedAmount: evaluatedPromotion.platformFundedAmount,
      allocations: evaluatedPromotion.allocations
    });
    discountTotal += evaluatedPromotion.amount;

    for (const allocation of evaluatedPromotion.allocations) {
      const currentAmount = workingTotals.get(allocation.listingId) ?? 0;
      workingTotals.set(
        allocation.listingId,
        Math.max(currentAmount - allocation.amount, 0)
      );
    }
  }

  return {
    subtotal,
    discountTotal,
    total: Math.max(subtotal - discountTotal, 0),
    discounts
  };
}

export function supportsMerchandisingDisplay(
  promotion: PricingPromotionCandidate
): boolean {
  if (promotion.couponCode) {
    return false;
  }

  if (promotion.type === "PERCENTAGE" || promotion.type === "CATEGORY_DISCOUNT") {
    return true;
  }

  if (promotion.type === "FIXED_AMOUNT") {
    return hasScopedTargets(promotion.configuration);
  }

  return false;
}

function evaluatePromotion(
  promotion: PricingPromotionCandidate,
  lines: PricingLine[],
  lineTotals: LineTotals,
  cartSubtotal: number,
  couponCode: string | null
): EvaluatedPromotion | null {
  const requiredCouponCode = normalizeCouponCode(promotion.couponCode);

  if (requiredCouponCode && requiredCouponCode !== couponCode) {
    return null;
  }

  const calculated = calculatePromotionEffect(
    promotion,
    lines,
    lineTotals,
    cartSubtotal
  );

  if (!calculated || calculated.amount <= 0) {
    return null;
  }

  const funding = splitFunding(
    calculated.amount,
    promotion.fundingSource,
    promotion.sellerFundingSharePercent
  );

  return {
    promotionId: promotion.promotionId,
    couponCode: requiredCouponCode,
    label: promotion.name,
    description: promotion.description,
    amount: calculated.amount,
    fundingSource: promotion.fundingSource,
    sellerFundedAmount: funding.sellerFundedAmount,
    platformFundedAmount: funding.platformFundedAmount,
    allocations: calculated.allocations,
    priority: promotion.priority,
    stackingMode: promotion.stackingMode
  };
}

function calculatePromotionEffect(
  promotion: PricingPromotionCandidate,
  lines: PricingLine[],
  lineTotals: LineTotals,
  cartSubtotal: number
) {
  switch (promotion.type) {
    case "PERCENTAGE":
      return calculateScopedPercentageEffect(
        promotion.configuration,
        lines,
        lineTotals
      );
    case "FIXED_AMOUNT":
      return calculateScopedFixedAmountEffect(
        promotion.configuration,
        lines,
        lineTotals
      );
    case "CART_THRESHOLD":
      return calculateCartThresholdEffect(
        promotion.configuration,
        lines,
        lineTotals,
        cartSubtotal
      );
    case "CATEGORY_DISCOUNT":
      return calculateCategoryDiscountEffect(
        promotion.configuration,
        lines,
        lineTotals
      );
    case "BUY_X_GET_Y":
      return calculateBuyXGetYEffect(promotion.configuration, lines, lineTotals);
    default:
      return null;
  }
}

function calculateScopedPercentageEffect(
  configuration: PromotionRuleConfiguration,
  lines: PricingLine[],
  lineTotals: LineTotals
) {
  const eligibleLines = getEligibleLines(lines, lineTotals, configuration);
  const eligibleSubtotal = sumEligibleLines(eligibleLines);
  const amount = calculatePercentageAmount(
    eligibleSubtotal,
    configuration.percentage
  );

  if (amount <= 0) {
    return null;
  }

  return {
    amount,
    allocations: allocateAmountAcrossLines(amount, eligibleLines)
  };
}

function calculateScopedFixedAmountEffect(
  configuration: PromotionRuleConfiguration,
  lines: PricingLine[],
  lineTotals: LineTotals
) {
  const eligibleLines = getEligibleLines(lines, lineTotals, configuration);
  const eligibleSubtotal = sumEligibleLines(eligibleLines);
  const amount = Math.min(
    clampIntegerAmount(configuration.amount),
    eligibleSubtotal
  );

  if (amount <= 0) {
    return null;
  }

  return {
    amount,
    allocations: allocateAmountAcrossLines(amount, eligibleLines)
  };
}

function calculateCartThresholdEffect(
  configuration: PromotionRuleConfiguration,
  lines: PricingLine[],
  lineTotals: LineTotals,
  cartSubtotal: number
) {
  if (
    configuration.thresholdAmount === undefined ||
    cartSubtotal < configuration.thresholdAmount
  ) {
    return null;
  }

  const eligibleLines = getEligibleLines(lines, lineTotals);
  const eligibleSubtotal = sumEligibleLines(eligibleLines);

  if (eligibleSubtotal <= 0) {
    return null;
  }

  const amount =
    configuration.amount !== undefined
      ? Math.min(clampIntegerAmount(configuration.amount), eligibleSubtotal)
      : calculatePercentageAmount(eligibleSubtotal, configuration.percentage);

  if (amount <= 0) {
    return null;
  }

  return {
    amount,
    allocations: allocateAmountAcrossLines(amount, eligibleLines)
  };
}

function calculateCategoryDiscountEffect(
  configuration: PromotionRuleConfiguration,
  lines: PricingLine[],
  lineTotals: LineTotals
) {
  const categorySlugs = configuration.categorySlugs ?? [];

  if (categorySlugs.length === 0) {
    return null;
  }

  const eligibleLines = getEligibleLines(lines, lineTotals, configuration);
  const eligibleSubtotal = sumEligibleLines(eligibleLines);

  if (eligibleSubtotal <= 0) {
    return null;
  }

  const amount =
    configuration.amount !== undefined
      ? Math.min(clampIntegerAmount(configuration.amount), eligibleSubtotal)
      : calculatePercentageAmount(eligibleSubtotal, configuration.percentage);

  if (amount <= 0) {
    return null;
  }

  return {
    amount,
    allocations: allocateAmountAcrossLines(amount, eligibleLines)
  };
}

function calculateBuyXGetYEffect(
  configuration: PromotionRuleConfiguration,
  lines: PricingLine[],
  lineTotals: LineTotals
) {
  const buyQuantity = configuration.buyQuantity ?? 0;
  const getQuantity = configuration.getQuantity ?? 0;

  if (buyQuantity <= 0 || getQuantity <= 0) {
    return null;
  }

  const eligibleLines = getEligibleLines(lines, lineTotals, configuration);
  const totalEligibleQuantity = eligibleLines.reduce(
    (sum, line) => sum + line.quantity,
    0
  );

  if (totalEligibleQuantity < buyQuantity + getQuantity) {
    return null;
  }

  const freeUnits =
    Math.floor(totalEligibleQuantity / (buyQuantity + getQuantity)) *
    getQuantity;

  if (freeUnits <= 0) {
    return null;
  }

  const unitPrices = eligibleLines
    .flatMap((line) => buildUnitPrices(line.amount, line.quantity).map((amount) => ({
      listingId: line.listingId,
      amount
    })))
    .sort((left, right) => left.amount - right.amount);
  const selectedUnits = unitPrices.slice(0, freeUnits);
  const allocationsByListing = new Map<string, number>();

  for (const unit of selectedUnits) {
    allocationsByListing.set(
      unit.listingId,
      (allocationsByListing.get(unit.listingId) ?? 0) + unit.amount
    );
  }

  const allocations = [...allocationsByListing.entries()].map(
    ([listingId, amount]) => ({
      listingId,
      amount
    })
  );
  const amount = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);

  if (amount <= 0) {
    return null;
  }

  return {
    amount,
    allocations
  };
}

function getEligibleLines(
  lines: PricingLine[],
  lineTotals: LineTotals,
  configuration?: PromotionRuleConfiguration
) {
  return lines
    .map((line) => ({
      ...line,
      amount: lineTotals.get(line.listingId) ?? 0
    }))
    .filter((line) => line.amount > 0)
    .filter((line) => (configuration ? matchesScopedLine(line, configuration) : true));
}

function sumEligibleLines(
  lines: Array<{
    amount: number;
  }>
) {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}

function allocateAmountAcrossLines(
  targetAmount: number,
  lines: Array<{
    listingId: string;
    amount: number;
  }>
): AppliedDiscountAllocation[] {
  const cappedTargetAmount = Math.min(
    targetAmount,
    lines.reduce((sum, line) => sum + line.amount, 0)
  );

  if (cappedTargetAmount <= 0 || lines.length === 0) {
    return [];
  }

  const provisional = lines.map((line) => {
    const exactShare = (cappedTargetAmount * line.amount) / sumEligibleLines(lines);
    const flooredAmount = Math.min(Math.floor(exactShare), line.amount);

    return {
      listingId: line.listingId,
      amount: flooredAmount,
      fractional: exactShare - flooredAmount,
      capacity: line.amount - flooredAmount
    };
  });
  let allocatedAmount = provisional.reduce((sum, line) => sum + line.amount, 0);
  let remainder = cappedTargetAmount - allocatedAmount;

  while (remainder > 0) {
    const nextLine = provisional
      .filter((line) => line.capacity > 0)
      .sort(
        (left, right) =>
          right.fractional - left.fractional ||
          left.listingId.localeCompare(right.listingId)
      )[0];

    if (!nextLine) {
      break;
    }

    nextLine.amount += 1;
    nextLine.capacity -= 1;
    remainder -= 1;
    allocatedAmount += 1;
  }

  return provisional
    .filter((line) => line.amount > 0)
    .map((line) => ({
      listingId: line.listingId,
      amount: line.amount
    }));
}

function buildUnitPrices(totalAmount: number, quantity: number) {
  if (quantity <= 0) {
    return [];
  }

  const baseAmount = Math.floor(totalAmount / quantity);
  const remainder = totalAmount % quantity;

  return Array.from({ length: quantity }, (_, index) =>
    index < remainder ? baseAmount + 1 : baseAmount
  );
}

function splitFunding(
  amount: number,
  fundingSource: PromotionFundingSource,
  sellerFundingSharePercent: number | null
) {
  if (fundingSource === "SELLER") {
    return {
      sellerFundedAmount: amount,
      platformFundedAmount: 0
    };
  }

  if (fundingSource === "SHARED") {
    const sellerSharePercent = sellerFundingSharePercent ?? 0;
    const sellerFundedAmount = Math.floor(amount * (sellerSharePercent / 100));

    return {
      sellerFundedAmount,
      platformFundedAmount: amount - sellerFundedAmount
    };
  }

  return {
    sellerFundedAmount: 0,
    platformFundedAmount: amount
  };
}

function matchesScopedLine(
  line: PricingLine,
  configuration: PromotionRuleConfiguration
) {
  const hasListingScope = (configuration.listingIds?.length ?? 0) > 0;
  const hasCategoryScope = (configuration.categorySlugs?.length ?? 0) > 0;

  if (!hasListingScope && !hasCategoryScope) {
    return true;
  }

  return Boolean(
    configuration.listingIds?.includes(line.listingId) ||
      configuration.categorySlugs?.some(
        (categorySlug) =>
          line.categorySlug === categorySlug ||
          line.categoryPath.includes(categorySlug)
      )
  );
}

function hasScopedTargets(configuration: PromotionRuleConfiguration) {
  return (
    (configuration.listingIds?.length ?? 0) > 0 ||
    (configuration.categorySlugs?.length ?? 0) > 0
  );
}

function calculatePercentageAmount(
  baseAmount: number,
  percentage: number | undefined
) {
  if (!percentage || percentage <= 0) {
    return 0;
  }

  return Math.floor(baseAmount * (percentage / 100));
}

function clampIntegerAmount(amount: number | undefined) {
  if (amount === undefined || amount <= 0) {
    return 0;
  }

  return Math.floor(amount);
}

function comparePromotions(
  left: EvaluatedPromotion,
  right: EvaluatedPromotion
) {
  if (left.priority !== right.priority) {
    return left.priority - right.priority;
  }

  if (left.amount !== right.amount) {
    return right.amount - left.amount;
  }

  return left.label.localeCompare(right.label);
}

function normalizeCouponCode(couponCode: string | null | undefined) {
  return couponCode ? couponCode.trim().toUpperCase() : null;
}
