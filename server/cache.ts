interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTtlMs: number;

  constructor(maxSize: number = 200, defaultTtlSeconds: number = 3600) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlSeconds * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs),
    });
  }

  invalidatePattern(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  stats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}

function hashKey(parts: string[]): string {
  const str = parts.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `c_${hash.toString(36)}`;
}

export const ragCache = new LRUCache<string>(100, 1800);
export const analysisCache = new LRUCache<string>(50, 3600);
export const agentCache = new LRUCache<any>(30, 1800);

export function ragCacheKey(patientId: number, question: string): string {
  return hashKey(["rag", String(patientId), question.toLowerCase().trim()]);
}

export function analysisCacheKey(patientId: number, reportHash: string): string {
  return hashKey(["analysis", String(patientId), reportHash]);
}

export function agentCacheKey(patientId: number, question: string, reportHash: string): string {
  return hashKey(["agent", String(patientId), question.toLowerCase().trim(), reportHash]);
}

export function reportsHash(reports: any[]): string {
  const sorted = reports
    .map(r => `${r.reportDate}_${r.reportType}_${r.psaLevel || ""}`)
    .sort()
    .join(",");
  return hashKey([sorted]);
}

export function invalidatePatientCache(patientId: number): void {
  const pattern = String(patientId);
  ragCache.invalidatePattern(pattern);
  analysisCache.invalidatePattern(pattern);
  agentCache.invalidatePattern(pattern);
}
