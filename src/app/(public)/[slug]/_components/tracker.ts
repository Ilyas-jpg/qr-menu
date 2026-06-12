"use client";

import type { Lang } from "@/lib/types";

/**
 * Kütüphanesiz analitik izleyici (~60 satır):
 *  - in-memory kuyruk → 5 sn debounce'la sendBeacon('/api/t')
 *  - sayfa kapanırken (pagehide/visibilitychange) flush
 *  - session bazlı dedup (sessionStorage) — kategori/ürün tekrarları şişirmez
 * PII yok; oturum kimliği SUNUCUDA üretilir (salt sırrı client'a inmez).
 */

type EventType =
  | "qr_scan"
  | "menu_view"
  | "category_view"
  | "product_view"
  | "whatsapp_order_click"
  | "lang_switch";

interface TrackedEvent {
  type: EventType;
  product_id?: string | null;
  category_id?: string | null;
  lang?: Lang | null;
  table_code?: string | null;
}

let queue: TrackedEvent[] = [];
let timer: number | null = null;
let slugRef = "";

function flush() {
  if (timer) {
    window.clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0 || !slugRef) return;
  const batch = queue.slice(0, 25);
  queue = queue.slice(25);
  try {
    navigator.sendBeacon(
      "/api/t",
      new Blob([JSON.stringify({ slug: slugRef, events: batch })], { type: "application/json" })
    );
  } catch {
    /* analitik asla deneyimi bozmaz */
  }
  if (queue.length > 0) flush();
}

function schedule() {
  if (timer) return;
  timer = window.setTimeout(flush, 5000);
}

/** Session başına tek sefer kuralı (dedup) */
function once(key: string): boolean {
  const k = `mq-t-${slugRef}-${key}`;
  if (window.sessionStorage.getItem(k)) return false;
  window.sessionStorage.setItem(k, "1");
  return true;
}

export function initTracker(slug: string) {
  slugRef = slug;
  const onHide = () => {
    if (document.visibilityState === "hidden") flush();
  };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", onHide);
  return () => {
    flush();
    window.removeEventListener("pagehide", flush);
    document.removeEventListener("visibilitychange", onHide);
  };
}

export function track(e: TrackedEvent, dedupKey?: string) {
  if (!slugRef) return;
  if (dedupKey && !once(dedupKey)) return;
  queue.push(e);
  if (queue.length >= 25) flush();
  else schedule();
}
