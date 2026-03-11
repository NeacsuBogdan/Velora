import type { Money } from "@velora/contracts";

const currencyFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
  maximumFractionDigits: 2
});

export function formatMoney(money: Money): string {
  return currencyFormatter.format(money.amount / 100);
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}
