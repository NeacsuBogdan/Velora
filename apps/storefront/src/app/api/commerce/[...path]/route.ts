import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { STOREFRONT_API_URL } from "../../../../lib/storefront-api";
import {
  GUEST_CART_COOKIE_NAME,
  GUEST_CART_HEADER_NAME
} from "../../../../lib/commerce-session";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function proxyCommerceRequest(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const { path = [] } = await context.params;
  const upstreamPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const upstreamUrl = `${STOREFRONT_API_URL}/${upstreamPath}`;
  const contentType = request.headers.get("content-type");
  const cookie = request.headers.get("cookie");
  const userAgent = request.headers.get("user-agent") ?? "Velora Storefront";
  const body =
    request.method === "GET" || request.method === "DELETE"
      ? undefined
      : await request.text();
  const cookieStore = await cookies();
  const guestCartToken = cookieStore.get(GUEST_CART_COOKIE_NAME)?.value;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      cache: "no-store",
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(guestCartToken ? { [GUEST_CART_HEADER_NAME]: guestCartToken } : {}),
        "User-Agent": userAgent,
        Origin: process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000"
      },
      body
    });
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

    try {
      const jsonPayload = JSON.parse(payload) as {
        guestCartToken?: string;
      };

      if (typeof jsonPayload.guestCartToken === "string") {
        response.cookies.set(GUEST_CART_COOKIE_NAME, jsonPayload.guestCartToken, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production"
        });
      }
    } catch {
      // Ignore non-JSON payloads.
    }

    return response;
  } catch {
    return NextResponse.json(
      {
        message: "The storefront could not reach the commerce service."
      },
      { status: 503 }
    );
  }
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  return proxyCommerceRequest(request, context);
}

export async function POST(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  return proxyCommerceRequest(request, context);
}

export async function PATCH(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  return proxyCommerceRequest(request, context);
}

export async function DELETE(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  return proxyCommerceRequest(request, context);
}

