import type { Money } from "@velora/contracts";

const currencyFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
  maximumFractionDigits: 2
});

export function formatMoney(money: Money): string {
  return currencyFormatter.format(money.amount / 100);
}
