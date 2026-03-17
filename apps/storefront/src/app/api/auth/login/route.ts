import { NextResponse } from "next/server";

import { STOREFRONT_API_URL } from "../../../../lib/storefront-api";

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();

  try {
    const upstreamResponse = await fetch(`${STOREFRONT_API_URL}/auth/login`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
        "User-Agent": request.headers.get("user-agent") ?? "Velora Storefront",
        Origin:
          process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000",
      },
      body,
    });
    const payload = await upstreamResponse.text();
    const response = new NextResponse(payload, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type":
          upstreamResponse.headers.get("content-type") ?? "application/json",
      },
    });
    const setCookie = upstreamResponse.headers.get("set-cookie");

    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch {
    return NextResponse.json(
      {
        message:
          "The storefront could not reach the authentication service.",
      },
      { status: 503 },
    );
  }
}
