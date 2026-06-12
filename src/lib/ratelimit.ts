import "server-only";

/**
 * Basit in-memory token bucket — process başına.
 * Passenger çok-process'te her process kendi kovasını tutar; bu ölçekte yeterli
 * (asıl güvence DB-seviyesi partial unique index + cooldown sorguları).
 */

interface Bucket {
  tokens: number;
  last: number;
}

const buckets = new Map<string, Bucket>();

// Bellek hijyeni: 10 dk'da bir eski kovaları süpür
const SWEEP_MS = 10 * 60 * 1000;
let lastSweep = Date.now();

export function rateLimit(
  key: string,
  { capacity = 10, refillPerSec = 0.17 }: { capacity?: number; refillPerSec?: number } = {}
): boolean {
  const now = Date.now();

  if (now - lastSweep > SWEEP_MS) {
    lastSweep = now;
    for (const [k, b] of buckets) {
      if (now - b.last > SWEEP_MS) buckets.delete(k);
    }
  }

  const b = buckets.get(key) ?? { tokens: capacity, last: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.last) / 1000) * refillPerSec);
  b.last = now;

  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

/** İstemci IP'si (LiteSpeed/Passenger arkasında x-forwarded-for ilk değer) */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
