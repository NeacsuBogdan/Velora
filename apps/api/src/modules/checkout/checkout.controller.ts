import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import type { AuthenticatedUser } from "@velora/contracts";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RateLimit } from "../../common/decorators/rate-limit.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { CheckoutService } from "./checkout.service";

@Controller("checkout")
@UseGuards(SessionAuthGuard, RolesGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get("overview")
  @Roles("ADMIN", "CUSTOMER")
  getOverview(@CurrentUser() viewer: AuthenticatedUser) {
    return this.checkoutService.getOverview(viewer);
  }

  @Post("sessions")
  @UseGuards(RateLimitGuard)
  @RateLimit("CHECKOUT_CREATE")
  @Roles("CUSTOMER")
  createCheckoutSession(
    @CurrentUser() viewer: AuthenticatedUser,
    @Body() body: unknown
  ) {
    return this.checkoutService.createCheckoutSession(viewer, body);
  }

  @Get("sessions/:checkoutSessionId")
  @Roles("CUSTOMER")
  getCheckoutSession(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("checkoutSessionId") checkoutSessionId: string
  ) {
    return this.checkoutService.getCheckoutSessionDetail(
      viewer,
      checkoutSessionId
    );
  }
}
