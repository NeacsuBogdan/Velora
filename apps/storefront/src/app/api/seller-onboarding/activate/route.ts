import { NextResponse } from "next/server";

import { STOREFRONT_API_URL } from "../../../../lib/storefront-api";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const token =
    typeof body?.token === "string" && body.token.trim().length > 0
      ? body.token.trim()
      : null;

  if (!token) {
    return NextResponse.json(
      {
        message: "Seller activation token is required."
      },
      { status: 400 }
    );
  }

  try {
    const upstreamResponse = await fetch(
      `${STOREFRONT_API_URL}/seller-onboarding/activation/${encodeURIComponent(
        token
      )}`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            request.headers.get("user-agent") ?? "Velora Storefront",
          Origin:
            process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000"
        },
        body: JSON.stringify({
          firstName: typeof body?.firstName === "string" ? body.firstName : undefined,
          lastName: typeof body?.lastName === "string" ? body.lastName : undefined,
          password: typeof body?.password === "string" ? body.password : undefined
        })
      }
    );
    const payload = await upstreamResponse.text();
    const response = new NextResponse(payload, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type":
          upstreamResponse.headers.get("content-type") ?? "application/json"
      }
    });
    const setCookie = upstreamResponse.headers.get("set-cookie");

    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch {
    return NextResponse.json(
      {
        message: "The storefront could not reach the seller onboarding service."
      },
      { status: 503 }
    );
  }
}
