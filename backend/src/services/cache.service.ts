import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

interface CacheEntry {
  value: any;
  expiresAt: number; // Milliseconds timestamp
}

export class CacheService {
  private static redisClient: Redis | null = null;
  private static isRedisAvailable = false;
  private static memoryCache: Map<string, CacheEntry> = new Map();
  private static initialized = false;

  public static async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const client = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        connectTimeout: 400,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null // Non-blocking: don't hang if Redis is offline
      });

      client.on('error', () => {
        this.isRedisAvailable = false;
      });

      await new Promise<void>((resolve, reject) => {
        client.ping((err) => {
          if (err) reject(err);
          else resolve();
        });
        setTimeout(() => reject(new Error('Redis timeout')), 400);
      });

      this.redisClient = client;
      this.isRedisAvailable = true;
      console.log(`[CacheService] Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}. L2 Caching Active.`);
    } catch (err) {
      this.isRedisAvailable = false;
      this.redisClient = null;
      // In-memory fallback
    }
  }

  /**
   * Check if Redis is actively connected
   */
  public static isRedisConnected(): boolean {
    return this.isRedisAvailable;
  }

  /**
   * Retrieve cached value by key
   */
  public static async get<T>(key: string): Promise<T | null> {
    if (!this.initialized) {
      await this.init().catch(() => {});
    }

    // 1. Try Redis first if available
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        if (val) {
          return JSON.parse(val) as T;
        }
      } catch (err) {
        // Fall back to memory cache on Redis error
      }
    }

    // 2. Fall back to In-Memory Cache
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Store value in cache with Time-To-Live (TTL in seconds)
   */
  public static async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (!this.initialized) {
      await this.init().catch(() => {});
    }

    // 1. Save to Redis
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err) {
        // Continue to memory cache
      }
    }

    // 2. Always maintain in memoryCache
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  /**
   * Invalidate / Delete a specific cache key immediately
   */
  public static async del(key: string): Promise<void> {
    if (!this.initialized) {
      await this.init().catch(() => {});
    }

    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (err) {}
    }

    this.memoryCache.delete(key);
  }

  /**
   * Purge all cache entries
   */
  public static async flush(): Promise<void> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.flushdb();
      } catch (err) {}
    }
    this.memoryCache.clear();
  }

  /**
   * Debug / inspection helper: Returns current memory cache size
   */
  public static getMemoryCacheSize(): number {
    return this.memoryCache.size;
  }
}

// Non-blocking initialization on load
CacheService.init().catch(() => {});
