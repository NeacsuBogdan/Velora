import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const needsSellerSession =
    pathname.startsWith("/seller") && pathname !== "/seller/login";
  const needsCustomerSession =
    pathname.startsWith("/account") ||
    pathname === "/cart" ||
    pathname.startsWith("/checkout");

  if ((needsSellerSession || needsCustomerSession) && !request.cookies.get("velora_session")?.value) {
    const loginUrl = new URL(needsSellerSession ? "/seller/login" : "/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/cart", "/checkout/:path*", "/seller/:path*"]
};
