import "server-only";

import type {
  AdminCatalogOptions,
  AdminCategorySummary,
  AdminCustomerSummary,
  AdminDashboard,
  AdminInventoryItem,
  AdminOperationsOverview,
  AdminOrderDetail,
  AdminOrderSummary,
  AdminProductSummary,
  AdminSellerApplicationSummary,
  AdminSellerSummary,
  DomainOverview,
  NotificationFeed,
  PromotionSummary,
  SessionResponse
} from "@velora/contracts";
import { cookies } from "next/headers";

import { apiUrl } from "./api-url";

function buildSessionCookieHeader(
  sessionToken?: string
): Record<string, string> | undefined {
  return sessionToken ? { cookie: `velora_session=${sessionToken}` } : undefined;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit
): Promise<T | null> {
  try {
    const response = await fetch(`${apiUrl}${path}`, init);

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
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

export async function getSession(): Promise<SessionResponse | null> {
  return getAuthenticatedJson<SessionResponse>("/auth/session");
}

export async function getPromotions(): Promise<PromotionSummary[] | null> {
  return getAuthenticatedJson<PromotionSummary[]>("/promotions");
}

export async function getPromotionsOverview(): Promise<DomainOverview | null> {
  return getAuthenticatedJson<DomainOverview>("/promotions/overview");
}

export async function getAdminDashboard(): Promise<AdminDashboard | null> {
  return getAuthenticatedJson<AdminDashboard>("/admin/dashboard");
}

export async function getAdminCatalogOptions(): Promise<AdminCatalogOptions | null> {
  return getAuthenticatedJson<AdminCatalogOptions>("/admin/catalog-options");
}

export async function getAdminCategories(): Promise<AdminCategorySummary[] | null> {
  return getAuthenticatedJson<AdminCategorySummary[]>("/admin/categories");
}

export async function getAdminProducts(): Promise<AdminProductSummary[] | null> {
  return getAuthenticatedJson<AdminProductSummary[]>("/admin/products");
}

export async function getAdminInventory(): Promise<AdminInventoryItem[] | null> {
  return getAuthenticatedJson<AdminInventoryItem[]>("/admin/inventory?lowStock=true");
}

export async function getAdminOrders(): Promise<AdminOrderSummary[] | null> {
  return getAuthenticatedJson<AdminOrderSummary[]>("/admin/orders");
}

export async function getAdminOrderDetail(
  number: string
): Promise<AdminOrderDetail | null> {
  return getAuthenticatedJson<AdminOrderDetail>(`/admin/orders/${number}`);
}

export async function getAdminCustomers(): Promise<AdminCustomerSummary[] | null> {
  return getAuthenticatedJson<AdminCustomerSummary[]>("/admin/customers");
}

export async function getAdminSellers(): Promise<AdminSellerSummary[] | null> {
  return getAuthenticatedJson<AdminSellerSummary[]>("/admin/sellers");
}

export async function getAdminSellerApplications(): Promise<
  AdminSellerApplicationSummary[] | null
> {
  return getAuthenticatedJson<AdminSellerApplicationSummary[]>(
    "/admin/seller-applications"
  );
}

export async function getAdminOperations(): Promise<AdminOperationsOverview | null> {
  return getAuthenticatedJson<AdminOperationsOverview>("/admin/operations");
}

export async function getNotificationFeed(
  limit = 12
): Promise<NotificationFeed | null> {
  return getAuthenticatedJson<NotificationFeed>(
    `/notifications?limit=${encodeURIComponent(String(limit))}`
  );
}
