import "server-only";

import type {
  CatalogNavigation,
  CatalogSearchResponse,
  CartDetail,
  CategoryDetail,
  CheckoutSessionDetail,
  DomainOverview,
  OrderDetail,
  ProductDetail,
  SessionResponse
} from "@velora/contracts";
import { cookies } from "next/headers";

import { type CatalogQueryInput, toUrlSearchParams } from "./catalog-query";

export const STOREFRONT_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function buildSessionCookieHeader(
  sessionToken?: string
): Record<string, string> | undefined {
  return sessionToken ? { cookie: `velora_session=${sessionToken}` } : undefined;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit
): Promise<T | null> {
  try {
    const response = await fetch(`${STOREFRONT_API_URL}${path}`, init);

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getDomainOverview(
  path: string
): Promise<DomainOverview | null> {
  return requestJson<DomainOverview>(path, {
    next: { revalidate: 60 }
  });
}

export async function getSession(): Promise<SessionResponse | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("velora_session")?.value;

  if (!sessionToken) {
    return null;
  }

  return requestJson<SessionResponse>("/auth/session", {
    cache: "no-store",
    headers: buildSessionCookieHeader(sessionToken)
  });
}

export async function getAuthenticatedOverview(
  path: string
): Promise<DomainOverview | null> {
  return getAuthenticatedJson<DomainOverview>(path);
}

async function getAuthenticatedJson<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("velora_session")?.value;

  if (!sessionToken) {
    return null;
  }

  return requestJson<T>(path, {
    cache: "no-store",
    headers: buildSessionCookieHeader(sessionToken)
  });
}

export async function getCart(): Promise<CartDetail | null> {
  return getAuthenticatedJson<CartDetail>("/cart");
}

export async function getCheckoutSession(
  checkoutSessionId: string
): Promise<CheckoutSessionDetail | null> {
  return getAuthenticatedJson<CheckoutSessionDetail>(
    `/checkout/sessions/${checkoutSessionId}`
  );
}

export async function getOrderDetail(
  number: string
): Promise<OrderDetail | null> {
  return getAuthenticatedJson<OrderDetail>(`/orders/${encodeURIComponent(number)}`);
}

export async function getCatalogNavigation(): Promise<CatalogNavigation | null> {
  return requestJson<CatalogNavigation>("/catalog/navigation", {
    next: { revalidate: 60 }
  });
}

export async function getCategoryDetail(
  slug: string
): Promise<CategoryDetail | null> {
  return requestJson<CategoryDetail>(`/catalog/categories/${slug}`, {
    next: { revalidate: 60 }
  });
}

export async function getProductDetail(
  slug: string
): Promise<ProductDetail | null> {
  return requestJson<ProductDetail>(`/catalog/products/${slug}`, {
    next: { revalidate: 60 }
  });
}

export async function searchCatalog(
  input: CatalogQueryInput
): Promise<CatalogSearchResponse | null> {
  const query = toUrlSearchParams(input).toString();

  return requestJson<CatalogSearchResponse>(
    `/search/products${query ? `?${query}` : ""}`,
    {
      next: { revalidate: 60 }
    }
  );
}
