export const GUEST_CART_COOKIE_NAME = "velora_guest_cart";
export const GUEST_CART_HEADER_NAME = "x-velora-guest-cart-token";

export function buildCommerceHeaders(
  sessionToken?: string,
  guestCartToken?: string
): Record<string, string> | undefined {
  const headers: Record<string, string> = {};

  if (sessionToken) {
    headers.cookie = `velora_session=${sessionToken}`;
  }

  if (guestCartToken) {
    headers[GUEST_CART_HEADER_NAME] = guestCartToken;
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}

