import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type { AuthenticatedUser } from "@velora/contracts";

import type { AuthenticatedRequest } from "../../common/authenticated-request";
import { GUEST_CART_TOKEN_HEADER } from "../../common/commerce-context";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RateLimit } from "../../common/decorators/rate-limit.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { OptionalSessionAuthGuard } from "../../common/guards/optional-session-auth.guard";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { CheckoutService } from "./checkout.service";

@Controller("checkout")
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get("overview")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("ADMIN", "CUSTOMER")
  getOverview(@CurrentUser() viewer: AuthenticatedUser) {
    return this.checkoutService.getOverview(viewer);
  }

  @Post("sessions")
  @UseGuards(OptionalSessionAuthGuard, RateLimitGuard)
  @RateLimit("CHECKOUT_CREATE")
  createCheckoutSession(
    @Req() request: AuthenticatedRequest,
    @Headers(GUEST_CART_TOKEN_HEADER) guestCartToken: string | undefined,
    @Body() body: unknown
  ) {
    return this.checkoutService.createCheckoutSession(
      {
        user: request.auth?.user ?? null,
        guestCartToken: guestCartToken ?? null
      },
      body
    );
  }

  @Get("sessions/:checkoutSessionId")
  @UseGuards(OptionalSessionAuthGuard)
  getCheckoutSession(
    @Req() request: AuthenticatedRequest,
    @Headers(GUEST_CART_TOKEN_HEADER) guestCartToken: string | undefined,
    @Param("checkoutSessionId") checkoutSessionId: string
  ) {
    return this.checkoutService.getCheckoutSessionDetail(
      {
        user: request.auth?.user ?? null,
        guestCartToken: guestCartToken ?? null
      },
      checkoutSessionId
    );
  }

  @Get("confirmations/:number")
  @UseGuards(OptionalSessionAuthGuard)
  getCheckoutConfirmation(
    @Req() request: AuthenticatedRequest,
    @Headers(GUEST_CART_TOKEN_HEADER) guestCartToken: string | undefined,
    @Param("number") number: string
  ) {
    return this.checkoutService.getCheckoutConfirmationDetail(
      {
        user: request.auth?.user ?? null,
        guestCartToken: guestCartToken ?? null
      },
      number
    );
  }
}
