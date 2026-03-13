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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RateLimit } from "../../common/decorators/rate-limit.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("overview")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("ADMIN")
  getOverview() {
    return this.paymentsService.getOverview();
  }

  @Post("checkout-sessions/:checkoutSessionId/attempts")
  @UseGuards(SessionAuthGuard, RolesGuard, RateLimitGuard)
  @RateLimit("PAYMENT_ATTEMPT_CREATE")
  @Roles("CUSTOMER")
  createPaymentAttempt(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("checkoutSessionId") checkoutSessionId: string,
    @Body() body: unknown
  ) {
    return this.paymentsService.createPaymentAttempt(
      viewer,
      checkoutSessionId,
      body
    );
  }

  @Post("attempts/:attemptId/confirm")
  @UseGuards(SessionAuthGuard, RolesGuard, RateLimitGuard)
  @RateLimit("PAYMENT_ATTEMPT_CONFIRM")
  @Roles("CUSTOMER")
  confirmPaymentAttempt(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Body() body: unknown
  ) {
    return this.paymentsService.confirmPaymentAttempt(viewer, attemptId, body);
  }

  @Post("orders/:orderId/refunds")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("ADMIN")
  createRefund(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: unknown
  ) {
    return this.paymentsService.createRefund(viewer, orderId, body);
  }

  @Post("webhooks/stripe")
  handleStripeWebhook(
    @Req() request: AuthenticatedRequest,
    @Headers("stripe-signature") signature?: string
  ) {
    return this.paymentsService.handleStripeWebhook(
      request.rawBody,
      signature
    );
  }
}
