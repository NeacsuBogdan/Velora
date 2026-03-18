import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const isPublicSellerRoute =
    pathname === "/seller/login" || pathname === "/seller/activate";
  const needsSellerSession =
    pathname.startsWith("/seller") && !isPublicSellerRoute;
  const needsCustomerSession = pathname.startsWith("/account");

  if ((needsSellerSession || needsCustomerSession) && !request.cookies.get("velora_session")?.value) {
    const loginUrl = new URL(needsSellerSession ? "/seller/login" : "/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/seller/:path*"]
};
