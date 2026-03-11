import type {
  PromotionRuleConfiguration
} from "@velora/contracts";
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
  stackingMode: PromotionStackingMode;
  priority: number;
  couponCode: string | null;
  configuration: PromotionRuleConfiguration;
}

export interface AppliedDiscountResult {
  promotionId: string | null;
  couponCode: string | null;
  label: string;
  description: string | null;
  amount: number;
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

export function evaluatePromotions(
  input: PricingEvaluationInput
): PricingEvaluationResult {
  const subtotal = input.lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );
  const normalizedCouponCode = normalizeCouponCode(input.couponCode);
  const eligiblePromotions = input.promotions
    .map((promotion) =>
      evaluatePromotion(promotion, input.lines, subtotal, normalizedCouponCode)
    )
    .filter((promotion): promotion is EvaluatedPromotion => promotion !== null)
    .sort(comparePromotions);

  const exclusivePromotion = eligiblePromotions.find(
    (promotion) => promotion.stackingMode === "EXCLUSIVE"
  );
  const selectedPromotions = exclusivePromotion
    ? [exclusivePromotion]
    : eligiblePromotions;

  const discounts: AppliedDiscountResult[] = [];
  let discountTotal = 0;

  for (const promotion of selectedPromotions) {
    const remaining = Math.max(subtotal - discountTotal, 0);

    if (remaining <= 0) {
      break;
    }

    const amount = Math.min(promotion.amount, remaining);

    if (amount <= 0) {
      continue;
    }

    discounts.push({
      promotionId: promotion.promotionId,
      couponCode: promotion.couponCode,
      label: promotion.label,
      description: promotion.description,
      amount
    });
    discountTotal += amount;
  }

  return {
    subtotal,
    discountTotal,
    total: Math.max(subtotal - discountTotal, 0),
    discounts
  };
}

function evaluatePromotion(
  promotion: PricingPromotionCandidate,
  lines: PricingLine[],
  subtotal: number,
  couponCode: string | null
): EvaluatedPromotion | null {
  const requiredCouponCode = normalizeCouponCode(promotion.couponCode);

  if (requiredCouponCode && requiredCouponCode !== couponCode) {
    return null;
  }

  const amount = calculatePromotionAmount(promotion, lines, subtotal);

  if (amount <= 0) {
    return null;
  }

  return {
    promotionId: promotion.promotionId,
    couponCode: requiredCouponCode,
    label: promotion.name,
    description: promotion.description,
    amount,
    priority: promotion.priority,
    stackingMode: promotion.stackingMode
  };
}

function calculatePromotionAmount(
  promotion: PricingPromotionCandidate,
  lines: PricingLine[],
  subtotal: number
) {
  switch (promotion.type) {
    case "PERCENTAGE":
      return calculatePercentageAmount(
        subtotal,
        promotion.configuration.percentage
      );
    case "FIXED_AMOUNT":
      return clampIntegerAmount(promotion.configuration.amount);
    case "CART_THRESHOLD":
      return calculateCartThresholdAmount(promotion.configuration, subtotal);
    case "CATEGORY_DISCOUNT":
      return calculateCategoryDiscountAmount(promotion.configuration, lines);
    case "BUY_X_GET_Y":
      return calculateBuyXGetYAmount(promotion.configuration, lines);
    default:
      return 0;
  }
}

function calculateCartThresholdAmount(
  configuration: PromotionRuleConfiguration,
  subtotal: number
) {
  if (
    configuration.thresholdAmount === undefined ||
    subtotal < configuration.thresholdAmount
  ) {
    return 0;
  }

  if (configuration.amount !== undefined) {
    return clampIntegerAmount(configuration.amount);
  }

  return calculatePercentageAmount(subtotal, configuration.percentage);
}

function calculateCategoryDiscountAmount(
  configuration: PromotionRuleConfiguration,
  lines: PricingLine[]
) {
  const categorySlugs = configuration.categorySlugs ?? [];

  if (categorySlugs.length === 0) {
    return 0;
  }

  const eligibleSubtotal = lines
    .filter((line) =>
      categorySlugs.some(
        (categorySlug) =>
          line.categorySlug === categorySlug ||
          line.categoryPath.includes(categorySlug)
      )
    )
    .reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  if (eligibleSubtotal <= 0) {
    return 0;
  }

  if (configuration.amount !== undefined) {
    return Math.min(clampIntegerAmount(configuration.amount), eligibleSubtotal);
  }

  return calculatePercentageAmount(
    eligibleSubtotal,
    configuration.percentage
  );
}

function calculateBuyXGetYAmount(
  configuration: PromotionRuleConfiguration,
  lines: PricingLine[]
) {
  const buyQuantity = configuration.buyQuantity ?? 0;
  const getQuantity = configuration.getQuantity ?? 0;

  if (buyQuantity <= 0 || getQuantity <= 0) {
    return 0;
  }

  const eligibleLines = lines.filter((line) => matchesScopedLine(line, configuration));
  const totalEligibleQuantity = eligibleLines.reduce(
    (sum, line) => sum + line.quantity,
    0
  );

  if (totalEligibleQuantity < buyQuantity + getQuantity) {
    return 0;
  }

  const freeUnits =
    Math.floor(totalEligibleQuantity / (buyQuantity + getQuantity)) *
    getQuantity;

  if (freeUnits <= 0) {
    return 0;
  }

  const unitPrices = eligibleLines
    .flatMap((line) => Array.from({ length: line.quantity }, () => line.unitPrice))
    .sort((left, right) => left - right);

  return unitPrices.slice(0, freeUnits).reduce((sum, value) => sum + value, 0);
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
