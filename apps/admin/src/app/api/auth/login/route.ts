import { NextResponse } from "next/server";

import { apiUrl } from "../../../../lib/api-url";

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();

  try {
    const upstreamResponse = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
        "User-Agent": request.headers.get("user-agent") ?? "Velora Admin",
        Origin: process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001",
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
        message: "The admin workspace could not reach the authentication service.",
      },
      { status: 503 },
    );
  }
}
