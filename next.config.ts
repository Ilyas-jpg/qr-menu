import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger Passenger self-host: lokal build → standalone çıktı sunucuya gider
  output: "standalone",
  // Görsel varyantları upload anında sharp ile üretiliyor; runtime optimizer kapalı
  // (LiteSpeed uploads/'ı doğrudan servis eder, Node CPU'ya binmez)
  images: { unoptimized: true },
  // Passenger çok-process ISR tutarlılığı: bellek LRU kapalı,
  // .next/cache FS cache'i tek doğruluk kaynağı (process'ler arası ortak)
  cacheMaxMemorySize: 0,
  // standalone trace'i bunları paketlemesin — deploy/*.tar.gz girerse paket yüzlerce MB şişer
  outputFileTracingExcludes: {
    "/*": ["./deploy/**/*", "./.uploads-dev/**/*", "./.chatgpt-images/**/*"],
  },
  experimental: {
    // QR trafiği = ilk-ziyaret ağırlıklı, yavaş mobil bağlantı: CSS'i HTML'e göm,
    // render-blocking stylesheet round-trip'ini kaldır (Slow-4G LCP)
    inlineCss: true,
  },
};

export default nextConfig;
