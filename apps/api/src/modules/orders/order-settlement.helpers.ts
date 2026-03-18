import {
  orderSettlementSummarySchema,
  type OrderSettlementLine,
  type OrderSettlementSummary
} from "@velora/contracts";

export function parseOrderSettlementSnapshot(
  value: unknown
): OrderSettlementSummary | null {
  const parsed = orderSettlementSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function findSellerSettlementLine(
  value: unknown,
  sellerId: string
): OrderSettlementLine | null {
  return (
    parseOrderSettlementSnapshot(value)?.lines.find(
      (line) => line.sellerId === sellerId
    ) ?? null
  );
}
