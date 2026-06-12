/**
 * Passenger startup dosyası (PassengerStartupFile start.js).
 * Standalone server.js .env'i kendisi YÜKLEMEZ — burada okuyup process.env'e basarız.
 * .env.production bu dosyanın yanında durur (source/), chmod 600, deploy'a DAHİL DEĞİL.
 */
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
