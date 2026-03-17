import { NextResponse } from "next/server";

import { STOREFRONT_API_URL } from "../../../../lib/storefront-api";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function proxySellerRequest(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const { path = [] } = await context.params;
  const upstreamPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const upstreamUrl = `${STOREFRONT_API_URL}/seller/${upstreamPath}`;
  const contentType = request.headers.get("content-type");
  const cookie = request.headers.get("cookie");
  const userAgent = request.headers.get("user-agent") ?? "Velora Storefront";
  const body =
    request.method === "GET" || request.method === "DELETE"
      ? undefined
      : await request.text();

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      cache: "no-store",
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
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

    return response;
  } catch {
    return NextResponse.json(
      {
        message: "The storefront could not reach the seller workspace service."
      },
      { status: 503 }
    );
  }
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  return proxySellerRequest(request, context);
}

export async function POST(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  return proxySellerRequest(request, context);
}

export async function PATCH(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  return proxySellerRequest(request, context);
}

export async function DELETE(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  return proxySellerRequest(request, context);
}
