type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const requestCache = new Map<string, CacheEntry<unknown>>();

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, normalize(item)]),
    );
  }

  return value;
}

export function withRequestCache<T>(
  cacheKey: string,
  params: Record<string, unknown>,
  loader: () => Promise<T>,
  ttlMs = 10_000,
): Promise<T> {
  const key = `${cacheKey}:${JSON.stringify(normalize(params))}`;
  const now = Date.now();
  const cached = requestCache.get(key) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = loader().catch((error) => {
    requestCache.delete(key);
    throw error;
  });

  requestCache.set(key, {
    expiresAt: now + ttlMs,
    promise,
  });

  return promise;
}

export function clearRequestCache(cacheKey?: string) {
  if (!cacheKey) {
    requestCache.clear();
    return;
  }

  for (const key of requestCache.keys()) {
    if (key.startsWith(`${cacheKey}:`)) {
      requestCache.delete(key);
    }
  }
}
