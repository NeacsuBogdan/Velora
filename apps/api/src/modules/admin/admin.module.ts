import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { InventoryModule } from "../inventory/inventory.module";
import { SearchModule } from "../search/search.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AuditModule, InventoryModule, SearchModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
