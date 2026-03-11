export type CatalogQueryInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

export function toUrlSearchParams(input: CatalogQueryInput): URLSearchParams {
  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input);
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) {
          searchParams.append(key, entry);
        }
      }

      continue;
    }

    if (value) {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}

export function getQueryValue(
  input: CatalogQueryInput,
  key: string
): string {
  return toUrlSearchParams(input).get(key) ?? "";
}

export function getQueryValues(
  input: CatalogQueryInput,
  key: string
): string[] {
  return toUrlSearchParams(input).getAll(key);
}
