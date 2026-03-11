import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { CheckoutModule } from "../checkout/checkout.module";
import { InventoryModule } from "../inventory/inventory.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [CheckoutModule, InventoryModule, AuditModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
