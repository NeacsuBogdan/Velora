import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./modules/app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  const logger = new Logger("Bootstrap");
  app.setGlobalPrefix(process.env.API_PREFIX ?? "api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true
    })
  );

  const port = Number(process.env.PORT ?? "4000");
  await app.listen(port);
  logger.log(`Velora API listening on http://localhost:${port}`);
}

void bootstrap();
