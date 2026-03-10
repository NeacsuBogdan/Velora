import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";

import { AppModule } from "./modules/app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  const logger = new Logger("Bootstrap");
  app.setGlobalPrefix(process.env.API_PREFIX ?? "api");
  app.enableCors({
    credentials: true,
    origin: [
      process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000",
      process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001"
    ]
  });
  app.use(cookieParser());

  const port = Number(process.env.PORT ?? "4000");
  await app.listen(port);
  logger.log(`Velora API listening on http://localhost:${port}`);
}

void bootstrap();
