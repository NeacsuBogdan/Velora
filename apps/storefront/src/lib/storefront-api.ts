import "server-only";

import type {
  AddressSummary,
  AuthenticatedUser,
  CatalogNavigation,
  CatalogSearchResponse,
  CartDetail,
  CategoryDetail,
  CheckoutSessionDetail,
  CustomerProfile,
  DomainOverview,
  NotificationFeed,
  OrderDetail,
  OrderSummary,
  ProductDetail,
  SellerActivationPreview,
  SellerDashboard,
  SellerProductCreationOptions,
  SellerListingCatalogOption,
  SellerListingSummary,
  SellerOrderDetail,
  SellerOrderSummary,
  SessionResponse,
} from "@velora/contracts";
import {
  authenticatedUserSchema,
  customerProfileSchema,
} from "@velora/contracts";
import { cookies } from "next/headers";

import { type CatalogQueryInput, toUrlSearchParams } from "./catalog-query";
import { apiUrl } from "./api-url";

export const STOREFRONT_API_URL =
  apiUrl;

export function buildSessionCookieHeader(
  sessionToken?: string,
): Record<string, string> | undefined {
  return sessionToken
    ? { cookie: `velora_session=${sessionToken}` }
    : undefined;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
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
  path: string,
): Promise<DomainOverview | null> {
  return requestJson<DomainOverview>(path, {
    next: { revalidate: 60 },
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
    headers: buildSessionCookieHeader(sessionToken),
  });
}

export async function getAuthenticatedOverview(
  path: string,
): Promise<DomainOverview | null> {
  return getAuthenticatedJson<DomainOverview>(path);
}

export async function getCurrentUserProfile(): Promise<CustomerProfile | null> {
  const profile = await getAuthenticatedJson<unknown>("/users/me");

  if (!profile) {
    return null;
  }

  const parsedProfile = customerProfileSchema.safeParse(profile);

  if (parsedProfile.success) {
    return parsedProfile.data;
  }

  const parsedUser = authenticatedUserSchema.safeParse(profile);

  if (!parsedUser.success) {
    return null;
  }

  return toFallbackCustomerProfile(parsedUser.data);
}

export async function getUserAddresses(): Promise<AddressSummary[]> {
  return (
    (await getAuthenticatedJson<AddressSummary[]>("/users/addresses")) ?? []
  );
}

async function getAuthenticatedJson<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("velora_session")?.value;

  if (!sessionToken) {
    return null;
  }

  return requestJson<T>(path, {
    cache: "no-store",
    headers: buildSessionCookieHeader(sessionToken),
  });
}

export async function getCart(): Promise<CartDetail | null> {
  return getAuthenticatedJson<CartDetail>("/cart");
}

export async function getCheckoutSession(
  checkoutSessionId: string,
): Promise<CheckoutSessionDetail | null> {
  return getAuthenticatedJson<CheckoutSessionDetail>(
    `/checkout/sessions/${checkoutSessionId}`,
  );
}

export async function getOrderDetail(
  number: string,
): Promise<OrderDetail | null> {
  return getAuthenticatedJson<OrderDetail>(
    `/orders/${encodeURIComponent(number)}`,
  );
}

export async function getOrders(): Promise<OrderSummary[]> {
  return (await getAuthenticatedJson<OrderSummary[]>("/orders")) ?? [];
}

export async function getSellerDashboard(): Promise<SellerDashboard | null> {
  return getAuthenticatedJson<SellerDashboard>("/seller/dashboard");
}

export async function getSellerListings(): Promise<SellerListingSummary[]> {
  return (
    (await getAuthenticatedJson<SellerListingSummary[]>("/seller/listings")) ??
    []
  );
}

export async function getSellerListingCatalogOptions(): Promise<
  SellerListingCatalogOption[]
> {
  return (
    (await getAuthenticatedJson<SellerListingCatalogOption[]>(
      "/seller/catalog-options",
    )) ?? []
  );
}

export async function getSellerProductCreationOptions(): Promise<
  SellerProductCreationOptions | null
> {
  return getAuthenticatedJson<SellerProductCreationOptions>(
    "/seller/creation-options"
  );
}

export async function getSellerOrders(): Promise<SellerOrderSummary[]> {
  return (
    (await getAuthenticatedJson<SellerOrderSummary[]>("/seller/orders")) ?? []
  );
}

export async function getSellerOrderDetail(
  number: string,
): Promise<SellerOrderDetail | null> {
  return getAuthenticatedJson<SellerOrderDetail>(
    `/seller/orders/${encodeURIComponent(number)}`,
  );
}

export async function getSellerActivationPreview(
  token: string
): Promise<SellerActivationPreview | null> {
  return requestJson<SellerActivationPreview>(
    `/seller-onboarding/activation/${encodeURIComponent(token)}`,
    {
      cache: "no-store"
    }
  );
}

export async function getNotificationFeed(
  limit = 12
): Promise<NotificationFeed | null> {
  return getAuthenticatedJson<NotificationFeed>(
    `/notifications?limit=${encodeURIComponent(String(limit))}`
  );
}

export async function getCatalogNavigation(): Promise<CatalogNavigation | null> {
  return requestJson<CatalogNavigation>("/catalog/navigation", {
    next: { revalidate: 60 },
  });
}

export async function getCategoryDetail(
  slug: string,
): Promise<CategoryDetail | null> {
  return requestJson<CategoryDetail>(`/catalog/categories/${slug}`, {
    cache: "no-store",
  });
}

export async function getProductDetail(
  slug: string,
): Promise<ProductDetail | null> {
  return requestJson<ProductDetail>(`/catalog/products/${slug}`, {
    cache: "no-store",
  });
}

export async function searchCatalog(
  input: CatalogQueryInput,
): Promise<CatalogSearchResponse | null> {
  const query = toUrlSearchParams(input).toString();

  return requestJson<CatalogSearchResponse>(
    `/search/products${query ? `?${query}` : ""}`,
    {
      next: { revalidate: 60 },
    },
  );
}

function toFallbackCustomerProfile(user: AuthenticatedUser): CustomerProfile {
  return {
    ...user,
    defaultShippingAddress: null,
    defaultBillingAddress: null,
    metrics: {
      addressCount: 0,
      orderCount: 0,
    },
  };
}
