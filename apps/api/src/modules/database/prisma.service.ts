import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

import { createPrismaAdapter } from "./prisma-adapter";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: createPrismaAdapter(),
      log: ["warn", "error"]
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
