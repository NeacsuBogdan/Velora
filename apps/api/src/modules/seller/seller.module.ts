import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PromotionsModule } from "../promotions/promotions.module";
import { SearchModule } from "../search/search.module";
import { SellerController } from "./seller.controller";
import { SellerService } from "./seller.service";

@Module({
  imports: [AuditModule, NotificationsModule, PromotionsModule, SearchModule],
  controllers: [SellerController],
  providers: [SellerService]
})
export class SellerModule {}
