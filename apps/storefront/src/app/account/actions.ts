"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { STOREFRONT_API_URL, buildSessionCookieHeader } from "../../lib/storefront-api";

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("velora_session")?.value;

  if (sessionToken) {
    await fetch(`${STOREFRONT_API_URL}/auth/logout`, {
      method: "POST",
      cache: "no-store",
      headers: buildSessionCookieHeader(sessionToken)
    }).catch(() => undefined);
  }

  cookieStore.delete("velora_session");
  redirect("/login");
}
