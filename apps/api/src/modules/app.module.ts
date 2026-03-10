import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { createEnv, apiEnvSchema } from "@velora/config";

import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => createEnv(apiEnvSchema, config)
    }),
    HealthModule
  ]
})
export class AppModule {}
