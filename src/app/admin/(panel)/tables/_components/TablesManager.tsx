"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteTable, upsertTable } from "@/app/admin/_actions/tables";

export interface AdminTable {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export function TablesManager({ initial, slug }: { initial: AdminTable[]; slug: string }) {
  const [tables, setTables] = useState<AdminTable[]>(initial);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const flash = (m: string) => {
    setError(m);
    window.setTimeout(() => setError(null), 4000);
  };

  const add = () => {
    const name = newName.trim();
    const code = (newCode.trim() || name).toLocaleLowerCase("tr-TR")
      .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
      .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
      .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!name || !code) return;
    startTransition(async () => {
      const r = await upsertTable({ name, code, is_active: true });
      if (!r.ok || !r.id) {
        flash(r.error ?? "Eklenemedi");
        return;
      }
      setTables((prev) => [...prev, { id: r.id!, code, name, sort_order: 9999, is_active: true }]);
      setNewName("");
      setNewCode("");
    });
  };

  const toggleActive = (t: AdminTable, value: boolean) => {
    setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: value } : x)));
    startTransition(async () => {
      const r = await upsertTable({ id: t.id, code: t.code, name: t.name, is_active: value });
      if (!r.ok) flash(r.error ?? "Güncellenemedi");
    });
  };

  const remove = (t: AdminTable) => {
    if (!window.confirm(`"${t.name}" silinsin mi? Basılı QR'ı varsa çalışmaz olur.`)) return;
    setTables((prev) => prev.filter((x) => x.id !== t.id));
    startTransition(async () => {
      const r = await deleteTable(t.id);
      if (!r.ok) flash(r.error ?? "Silinemedi");
    });
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold italic">Masalar & QR</h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            Her masaya bir QR — müşteri tarar, garson çağırır
          </p>
        </div>
        <Link
          href="/admin/tables/print"
          className="shrink-0 rounded-full bg-accent px-4 py-2.5 text-[13px] font-extrabold text-accent-fg active:scale-95"
        >
          🖨 QR Sayfası
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-danger/12 px-4 py-3 text-[13px] font-semibold text-danger">{error}</p>
      )}

      {/* yeni masa */}
      <div className="mb-4 flex gap-2 rounded-2xl border border-line bg-card p-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Masa adı (örn. Bahçe 3)"
          className="h-10 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-[14px] outline-none focus:border-accent"
        />
        <input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="kod (boşsa addan)"
          className="h-10 w-32 rounded-xl border border-line-strong bg-surface px-3 text-[13px] outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={add}
          disabled={pending || !newName.trim()}
          className="h-10 shrink-0 rounded-xl bg-accent px-4 text-[13px] font-extrabold text-accent-fg disabled:opacity-50"
        >
          Ekle
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {tables.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 ${t.is_active ? "" : "opacity-60"}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-extrabold">{t.name}</p>
              <p className="text-[12px] text-ink-2">
                /{slug}?m=<span className="text-accent">{t.code}</span>
              </p>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-ink-2">
              <input
                type="checkbox"
                checked={t.is_active}
                onChange={(e) => toggleActive(t, e.target.checked)}
                className="h-4 w-4 accent-(--mq-accent)"
              />
              Aktif
            </label>
            <button
              type="button"
              onClick={() => remove(t)}
              aria-label="Sil"
              className="rounded-lg px-2 py-1 text-[13px] text-danger/80 hover:bg-danger/10 hover:text-danger"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-[14px] text-ink-2">
          Henüz masa yok — yukarıdan ekle.
        </p>
      )}
    </div>
  );
}
