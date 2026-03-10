import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { createEnv, apiEnvSchema } from "@velora/config";

import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CartModule } from "./cart/cart.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { InventoryModule } from "./inventory/inventory.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { PromotionsModule } from "./promotions/promotions.module";
import { SearchSyncModule } from "./search-sync/search-sync.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => createEnv(apiEnvSchema, config)
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    CheckoutModule,
    PaymentsModule,
    OrdersModule,
    PromotionsModule,
    SearchSyncModule,
    AuditModule
  ]
})
export class AppModule {}
