import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
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
import { CartService } from "./cart.service";

@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get("overview")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("ADMIN", "CUSTOMER")
  getOverview(@CurrentUser() viewer: AuthenticatedUser) {
    return this.cartService.getOverview(viewer);
  }

  @Get()
  @UseGuards(OptionalSessionAuthGuard)
  getCart(
    @Req() request: AuthenticatedRequest,
    @Headers(GUEST_CART_TOKEN_HEADER) guestCartToken?: string
  ) {
    return this.cartService.getCart({
      user: request.auth?.user ?? null,
      guestCartToken: guestCartToken ?? null
    });
  }

  @Post("items")
  @UseGuards(OptionalSessionAuthGuard)
  addItem(
    @Req() request: AuthenticatedRequest,
    @Headers(GUEST_CART_TOKEN_HEADER) guestCartToken: string | undefined,
    @Body() body: unknown
  ) {
    return this.cartService.addItem(
      {
        user: request.auth?.user ?? null,
        guestCartToken: guestCartToken ?? null
      },
      body
    );
  }

  @Post("coupon")
  @UseGuards(OptionalSessionAuthGuard, RateLimitGuard)
  @RateLimit("CART_COUPON")
  applyCoupon(
    @Req() request: AuthenticatedRequest,
    @Headers(GUEST_CART_TOKEN_HEADER) guestCartToken: string | undefined,
    @Body() body: unknown
  ) {
    return this.cartService.applyCoupon(
      {
        user: request.auth?.user ?? null,
        guestCartToken: guestCartToken ?? null
      },
      body
    );
  }

  @Patch("items/:itemId")
  @UseGuards(OptionalSessionAuthGuard)
  updateItem(
    @Req() request: AuthenticatedRequest,
    @Headers(GUEST_CART_TOKEN_HEADER) guestCartToken: string | undefined,
    @Param("itemId") itemId: string,
    @Body() body: unknown
  ) {
    return this.cartService.updateItem(
      {
        user: request.auth?.user ?? null,
        guestCartToken: guestCartToken ?? null
      },
      itemId,
      body
    );
  }

  @Delete("items/:itemId")
  @UseGuards(OptionalSessionAuthGuard)
  removeItem(
    @Req() request: AuthenticatedRequest,
    @Headers(GUEST_CART_TOKEN_HEADER) guestCartToken: string | undefined,
    @Param("itemId") itemId: string,
  ) {
    return this.cartService.removeItem(
      {
        user: request.auth?.user ?? null,
        guestCartToken: guestCartToken ?? null
      },
      itemId
    );
  }

  @Delete("coupon")
  @UseGuards(OptionalSessionAuthGuard)
  removeCoupon(
    @Req() request: AuthenticatedRequest,
    @Headers(GUEST_CART_TOKEN_HEADER) guestCartToken?: string
  ) {
    return this.cartService.removeCoupon({
      user: request.auth?.user ?? null,
      guestCartToken: guestCartToken ?? null
    });
  }
}
