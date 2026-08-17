/**
 * Passenger startup dosyası (PassengerStartupFile start.js).
 * Standalone server.js .env'i kendisi YÜKLEMEZ — burada okuyup process.env'e basarız.
 * .env.production bu dosyanın yanında durur (source/), chmod 600, deploy'a DAHİL DEĞİL.
 */
/*
 * THREAD DİYETİ (2026-07-27) — paylaşımlı hosting'de asıl kıt kaynak process/thread.
 * Hesabın Max Processes tavanı 200; Node kütüphaneleri thread havuzlarını
 * MAKİNENİN çekirdek sayısına göre açıyor (shared kutu 32+ çekirdek) → tek app
 * onlarca thread yiyor, PHP siteleri fork edemeyip 503 veriyor.
 * Bu değerler libuv/sharp/V8 havuzlarını kutunun değil, işin boyutuna göre kurar.
 * İlk kullanımdan ÖNCE set edilmeli — bu yüzden dosyanın en başında.
 */
process.env.UV_THREADPOOL_SIZE ||= "2"; // varsayılan 4
process.env.VIPS_CONCURRENCY ||= "1"; // sharp/libvips: çekirdek sayısı kadar açardı
process.env.SHARP_CONCURRENCY ||= "1";
process.env.NEXT_TELEMETRY_DISABLED ||= "1";
// V8'in arka plan thread havuzu (--v8-pool-size) süreç BAŞLARKEN okunur; buradan
// set edilemez → .htaccess'teki SetEnv NODE_OPTIONS ile veriliyor.

const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, ".env.production");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

process.env.NODE_ENV = "production";
// Passenger PORT'u kendi atar; HOSTNAME localhost kalsın
process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";

require("./server.js");
