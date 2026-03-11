import {
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { domainOverviewSchema, type AuthenticatedUser } from "@velora/contracts";

import { PrismaService } from "../database/prisma.service";
import {
  mapOrderDetail,
  mapOrderSummary,
  orderDetailInclude,
  orderSummaryInclude
} from "./order.helpers";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(viewer: AuthenticatedUser) {
    const isAdmin = viewer.roles.some((role) => role.code === "ADMIN");
    const isSeller = viewer.roles.some((role) => role.code === "SELLER");
    const sellerScope = isSeller
      ? await this.prisma.seller.findUnique({
          where: { ownerUserId: viewer.id }
        })
      : null;

    const orderWhere = isAdmin
      ? undefined
      : sellerScope
        ? { items: { some: { listing: { sellerId: sellerScope.id } } } }
        : { userId: viewer.id };

    const [orderCount, orderItemCount, historyCount] = await Promise.all([
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.orderItem.count({
        where: isAdmin
          ? undefined
          : sellerScope
            ? { listing: { sellerId: sellerScope.id } }
            : { order: { userId: viewer.id } }
      }),
      this.prisma.orderStatusHistory.count({
        where: isAdmin
          ? undefined
          : sellerScope
            ? { order: { items: { some: { listing: { sellerId: sellerScope.id } } } } }
            : { order: { userId: viewer.id } }
      })
    ]);

    return domainOverviewSchema.parse({
      scope: "orders",
      metrics: {
        orders: orderCount,
        orderItems: orderItemCount,
        statusEvents: historyCount
      },
      notes: [
        isAdmin
          ? "Admin visibility across all order state."
          : sellerScope
            ? `Seller scope for ${sellerScope.displayName}.`
            : "Customer order history scope."
      ]
    });
  }

  async listOrders(viewer: AuthenticatedUser) {
    const where = await this.buildScopeWhere(viewer);
    const orders = await this.prisma.order.findMany({
      where,
      include: orderSummaryInclude.include,
      orderBy: {
        createdAt: "desc"
      }
    });

    return orders.map((order) => mapOrderSummary(order));
  }

  async getOrderDetail(viewer: AuthenticatedUser, number: string) {
    const where = await this.buildScopeWhere(viewer);
    const order = await this.prisma.order.findFirst({
      where: {
        ...where,
        number
      },
      include: orderDetailInclude.include
    });

    if (!order) {
      throw new NotFoundException(`Order ${number} was not found.`);
    }

    return mapOrderDetail(order);
  }

  private async buildScopeWhere(viewer: AuthenticatedUser) {
    if (viewer.roles.some((role) => role.code === "ADMIN")) {
      return {};
    }

    if (viewer.roles.some((role) => role.code === "SELLER")) {
      const sellerScope = await this.prisma.seller.findUnique({
        where: {
          ownerUserId: viewer.id
        }
      });

      if (!sellerScope) {
        return {
          id: "__no_seller_scope__"
        };
      }

      return {
        items: {
          some: {
            listing: {
              sellerId: sellerScope.id
            }
          }
        }
      };
    }

    return {
      userId: viewer.id
    };
  }
}
