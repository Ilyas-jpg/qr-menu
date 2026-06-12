"use client";

import { useRef, useState, useTransition } from "react";
import { imageSrc } from "@/lib/constants";
import { deleteProductImage, reorderProductImages } from "@/app/admin/_actions/images";

export interface AdminImage {
  id: string;
  file_stem: string;
  width: number;
  height: number;
  sort_order: number;
}

interface Props {
  productId: string;
  images: AdminImage[];
  onChange: (images: AdminImage[]) => void;
}

/**
 * Ürün galerisi: çoklu seçim → SERİ yükleme kuyruğu (LVE dostu),
 * ←/→ ile sırala (dialog içinde dnd yerine — mobilde daha güvenilir), ✕ ile sil.
 */
export function GalleryManager({ productId, images, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<{ total: number; done: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const upload = async (files: FileList) => {
    setError(null);
    const list = Array.from(files);
    setQueue({ total: list.length, done: 0 });

    let current = images;
    for (let i = 0; i < list.length; i++) {
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("file", list[i]);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Yükleme hatası");
        current = [...current, data.image as AdminImage];
        onChange(current);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Yükleme hatası");
        break;
      }
      setQueue({ total: list.length, done: i + 1 });
    }
    setQueue(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    startTransition(async () => {
      const r = await reorderProductImages(next.map((i) => i.id));
      if (!r.ok) setError(r.error ?? "Sıralama kaydedilemedi");
    });
  };

  const remove = (img: AdminImage) => {
    if (!window.confirm("Görsel silinsin mi?")) return;
    onChange(images.filter((i) => i.id !== img.id));
    startTransition(async () => {
      const r = await deleteProductImage(img.id);
      if (!r.ok) setError(r.error ?? "Silinemedi");
    });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((img, i) => (
          <div key={img.id} className="group relative overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc(img.file_stem, 200)}
              alt=""
              width={img.width}
              height={img.height}
              className="aspect-square w-full object-cover"
            />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-black text-accent-fg">
                KAPAK
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 px-1 py-0.5">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Sola taşı" className="px-1 text-[13px] text-white disabled:opacity-30">
                ←
              </button>
              <button type="button" onClick={() => remove(img)} aria-label="Sil" className="px-1 text-[12px] font-bold text-red-300">
                ✕
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Sağa taşı" className="px-1 text-[13px] text-white disabled:opacity-30">
                →
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={queue !== null}
          className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-line-strong text-[12px] font-bold text-ink-2 hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {queue ? `${queue.done}/${queue.total}…` : "+ Görsel"}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
      />

      <p className="text-[11px] text-ink-2">
        JPG/PNG/WebP · maks 10MB · ilk görsel menüde kapak olur · WebP varyantları otomatik üretilir
      </p>
      {error && (
        <p className="rounded-xl bg-danger/12 px-3 py-2 text-[12px] font-semibold text-danger">{error}</p>
      )}
    </div>
  );
}
