import "server-only";

import { createHash } from "node:crypto";

/**
 * KVKK-dostu oturum kimliği:
 *   sha256(dailySalt + ip + userAgent + tenantId)[:16]
 *   dailySalt = sha256(SECRET + YYYY-MM-DD)
 * Cookie yok, IP/UA saklanmaz, bağlanabilirlik 24 saatle sınırlı
 * (salt gece yarısı döner, dünün hash'i bugünle eşleşemez).
 */
export function sessionHash(ip: string, userAgent: string, tenantId: string): string {
  const secret = process.env.ANALYTICS_SALT_SECRET ?? "dev-salt";
  const day = new Date().toISOString().slice(0, 10);
  const dailySalt = createHash("sha256").update(secret + day).digest("hex");
  return createHash("sha256")
    .update(dailySalt + ip + userAgent + tenantId)
    .digest("hex")
    .slice(0, 16);
}
