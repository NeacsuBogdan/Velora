export function formatStatusLabel(value: string): string {
  const normalized = value.toLowerCase().replace(/_/g, " ");

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
