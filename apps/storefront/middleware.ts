import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-velora-pathname", pathname);

  const isPublicSellerRoute =
    pathname === "/seller/login" || pathname === "/seller/activate";
  const needsSellerSession =
    pathname.startsWith("/seller") && !isPublicSellerRoute;
  const needsCustomerSession =
    pathname.startsWith("/account") ||
    pathname === "/cart" ||
    pathname.startsWith("/checkout");

  if ((needsSellerSession || needsCustomerSession) && !request.cookies.get("velora_session")?.value) {
    const loginUrl = new URL(needsSellerSession ? "/seller/login" : "/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: ["/account/:path*", "/cart", "/checkout/:path*", "/seller/:path*"]
};
