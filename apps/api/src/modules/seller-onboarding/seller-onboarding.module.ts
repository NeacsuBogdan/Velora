import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { AdminSellerApplicationsController } from "./admin-seller-applications.controller";
import { SellerOnboardingController } from "./seller-onboarding.controller";
import { SellerOnboardingService } from "./seller-onboarding.service";

@Module({
  imports: [AuditModule],
  controllers: [
    SellerOnboardingController,
    AdminSellerApplicationsController
  ],
  providers: [SellerOnboardingService],
  exports: [SellerOnboardingService]
})
export class SellerOnboardingModule {}
