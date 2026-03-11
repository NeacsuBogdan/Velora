import "server-only";

import type {
  DomainOverview,
  PromotionSummary,
  SessionResponse
} from "@velora/contracts";
import { cookies } from "next/headers";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

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
