import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { createEnv, apiEnvSchema } from "@velora/config";

import { AdminModule } from "./admin/admin.module";
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
import { PlatformCacheModule } from "./platform-cache/platform-cache.module";
import { PromotionsModule } from "./promotions/promotions.module";
import { RateLimitModule } from "./rate-limit/rate-limit.module";
import { SearchModule } from "./search/search.module";
import { SearchSyncModule } from "./search-sync/search-sync.module";
import { SellerModule } from "./seller/seller.module";
import { SellerOnboardingModule } from "./seller-onboarding/seller-onboarding.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => createEnv(apiEnvSchema, config)
    }),
    DatabaseModule,
    PlatformCacheModule,
    RateLimitModule,
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
    SearchModule,
    SearchSyncModule,
    AuditModule,
    AdminModule,
    SellerModule,
    SellerOnboardingModule
  ]
})
export class AppModule {}
