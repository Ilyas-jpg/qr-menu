"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  tenantName: string;
  slug: string;
  baseUrl: string;
  tables: { id: string; code: string; name: string }[];
}

/** 2×4 A4 kart ızgarası; ekranda önizleme + yazdır butonu, @media print'te yalnız kartlar */
export function PrintSheet({ tenantName, slug, baseUrl, tables }: Props) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* ekran araç çubuğu — baskıda gizli */}
      <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-semibold italic">QR Baskı Sayfası</h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {tables.length} masa · A4 dikey · kesim çizgilerinden ayırın
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/tables"
            className="rounded-full border border-line-strong px-4 py-2.5 text-[13px] font-bold"
          >
            ← Masalar
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-extrabold text-accent-fg active:scale-95"
          >
            🖨 Yazdır / PDF
          </button>
        </div>
      </div>

      {/* kart ızgarası — baskıda beyaz zemin */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 print:gap-0 print:rounded-none print:p-0">
        {tables.map((t) => (
          <div
            key={t.id}
            className="flex flex-col items-center justify-between rounded-xl border-2 border-dashed border-zinc-300 px-4 py-5 text-center print:break-inside-avoid print:rounded-none"
            style={{ minHeight: 250 }}
          >
            <p className="text-[15px] font-extrabold tracking-tight text-zinc-900">{tenantName}</p>
            <QRCodeSVG
              value={`${baseUrl}/${slug}?m=${encodeURIComponent(t.code)}`}
              size={132}
              level="M"
              marginSize={2}
              className="my-2"
            />
            <div>
              <p className="text-[16px] font-black text-zinc-900">{t.name}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Menü için kameranızı okutun
              </p>
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-line-strong p-8 text-center text-[14px] text-ink-2 print:hidden">
          Aktif masa yok — önce Masalar sayfasından ekleyin.
        </p>
      )}

    </div>
  );
}
