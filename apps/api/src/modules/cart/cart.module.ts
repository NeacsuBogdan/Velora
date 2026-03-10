import { Controller, Get, Injectable, Module, UseGuards } from "@nestjs/common";
import {
  domainOverviewSchema,
  type AuthenticatedUser
} from "@velora/contracts";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { PrismaService } from "../database/prisma.service";

@Injectable()
class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(viewer: AuthenticatedUser) {
    const [cartCount, activeCartCount, cartItemCount] = await Promise.all([
      this.prisma.cart.count({
        where: viewer.roles.some((role) => role.code === "ADMIN")
          ? undefined
          : { userId: viewer.id }
      }),
      this.prisma.cart.count({
        where: viewer.roles.some((role) => role.code === "ADMIN")
          ? { status: "ACTIVE" }
          : { userId: viewer.id, status: "ACTIVE" }
      }),
      this.prisma.cartItem.count({
        where: viewer.roles.some((role) => role.code === "ADMIN")
          ? undefined
          : { cart: { userId: viewer.id } }
      })
    ]);

    return domainOverviewSchema.parse({
      scope: "cart",
      metrics: {
        carts: cartCount,
        activeCarts: activeCartCount,
        cartItems: cartItemCount
      },
      notes: [
        viewer.roles.some((role) => role.code === "ADMIN")
          ? "Admin overview across customer carts."
          : "Customer-scoped cart visibility."
      ]
    });
  }
}

@Controller("cart")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("ADMIN", "CUSTOMER")
class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get("overview")
  getOverview(@CurrentUser() viewer: AuthenticatedUser) {
    return this.cartService.getOverview(viewer);
  }
}

@Module({
  controllers: [CartController],
  providers: [CartService]
})
export class CartModule {}
