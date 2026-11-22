interface CacheItem<T = any> {
  value: T;
  expiresAt: number;
  tags: string[];
}

export class CacheService {
  private static instance: CacheService;
  private cache = new Map<string, CacheItem>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Background purge every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.purgeExpired();
    }, 60000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public get<T = any>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  public set<T = any>(key: string, value: T, ttlSeconds: number = 30, tags: string[] = []): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, {
      value,
      expiresAt,
      tags
    });
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public invalidateTag(tag: string): void {
    const target = tag.toLowerCase().trim();
    for (const [key, item] of this.cache.entries()) {
      if (item.tags.some(t => t.toLowerCase().trim() === target)) {
        this.cache.delete(key);
      }
    }
  }

  public invalidateTags(tags: string[]): void {
    for (const tag of tags) {
      this.invalidateTag(tag);
    }
  }

  public clear(): void {
    this.cache.clear();
  }

  public async wrap<T>(
    key: string,
    tags: string[],
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await fetcher();
    this.set(key, fresh, ttlSeconds, tags);
    return fresh;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const cacheService = CacheService.getInstance();
