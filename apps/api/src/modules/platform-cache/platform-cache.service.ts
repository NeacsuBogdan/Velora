import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type RedisClientType } from "redis";

interface MemoryEntry {
  expiresAt: number | null;
  value: string;
}

interface MemoryCounterEntry {
  count: number;
  expiresAt: number;
}

@Injectable()
export class PlatformCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlatformCacheService.name);
  private readonly client: RedisClientType | null;
  private readonly memoryStore = new Map<string, MemoryEntry>();
  private readonly counterStore = new Map<string, MemoryCounterEntry>();
  private redisReady = false;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>("REDIS_URL");

    this.client = redisUrl ? createClient({ url: redisUrl }) : null;

    this.client?.on("error", (error) => {
      this.redisReady = false;
      this.logger.warn(
        `Redis cache unavailable. Falling back to in-memory cache. ${error instanceof Error ? error.message : "Unknown Redis error."}`
      );
    });
  }

  async onModuleInit() {
    if (!this.client) {
      return;
    }

    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      this.redisReady = true;
      this.logger.log("Connected to Redis for cache and rate limiting.");
    } catch (error) {
      this.redisReady = false;
      this.logger.warn(
        `Redis connection failed. Using in-memory cache instead. ${error instanceof Error ? error.message : "Unknown Redis connection error."}`
      );
    }
  }

  async onModuleDestroy() {
    if (!this.client?.isOpen) {
      return;
    }

    await this.client.quit().catch(() => undefined);
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redisReady && this.client) {
      const value = await this.client.get(key);

      if (!value) {
        return null;
      }

      return this.parseValue<T>(key, value);
    }

    return this.getFromMemory<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number) {
    const serialized = JSON.stringify(value);

    if (this.redisReady && this.client) {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, serialized, {
          expiration: {
            type: "EX",
            value: ttlSeconds
          }
        });
        return;
      }

      await this.client.set(key, serialized);
      return;
    }

    this.memoryStore.set(key, {
      value: serialized,
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null
    });
  }

  async remember<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await loader();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async deleteByPrefix(prefixes: string[]) {
    const uniquePrefixes = [...new Set(prefixes.filter((prefix) => prefix.length > 0))];

    if (uniquePrefixes.length === 0) {
      return;
    }

    for (const key of [...this.memoryStore.keys(), ...this.counterStore.keys()]) {
      if (uniquePrefixes.some((prefix) => key.startsWith(prefix))) {
        this.memoryStore.delete(key);
        this.counterStore.delete(key);
      }
    }

    if (!this.redisReady || !this.client) {
      return;
    }

    for (const prefix of uniquePrefixes) {
      const keys: string[] = [];

      for await (const key of this.client.scanIterator({
        MATCH: `${prefix}*`,
        COUNT: 100
      })) {
        keys.push(String(key));
      }

      if (keys.length > 0) {
        await this.client.del(keys);
      }
    }
  }

  async incrementCounter(key: string, windowSeconds: number) {
    if (this.redisReady && this.client) {
      const count = await this.client.incr(key);

      if (count === 1) {
        await this.client.expire(key, windowSeconds);
      }

      const retryAfterSeconds = Math.max(await this.client.ttl(key), 0);

      return {
        count,
        retryAfterSeconds
      };
    }

    const now = Date.now();
    const current = this.counterStore.get(key);

    if (current && current.expiresAt > now) {
      current.count += 1;

      return {
        count: current.count,
        retryAfterSeconds: Math.max(
          Math.ceil((current.expiresAt - now) / 1000),
          0
        )
      };
    }

    this.counterStore.set(key, {
      count: 1,
      expiresAt: now + windowSeconds * 1000
    });

    return {
      count: 1,
      retryAfterSeconds: windowSeconds
    };
  }

  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryStore.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }

    return this.parseValue<T>(key, entry.value);
  }

  private parseValue<T>(key: string, value: string): T | null {
    try {
      return JSON.parse(value) as T;
    } catch {
      this.memoryStore.delete(key);
      return null;
    }
  }
}
