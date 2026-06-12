"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createTenant, updateTenantStatus } from "@/app/admin/_actions/platform";

export interface PlatformTenant {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  plan: "trial" | "full";
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  product_count: number;
}

function slugify(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
    .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

export function PlatformManager({ initial }: { initial: PlatformTenant[] }) {
  const [tenants, setTenants] = useState<PlatformTenant[]>(initial);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const flash = (m: string) => {
    setError(m);
    window.setTimeout(() => setError(null), 4000);
  };

  const toggleActive = (t: PlatformTenant, value: boolean) => {
    setTenants((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: value } : x)));
    startTransition(async () => {
      const r = await updateTenantStatus({ id: t.id, is_active: value });
      if (!r.ok) flash(r.error ?? "Güncellenemedi");
    });
  };

  const activateFull = (t: PlatformTenant) => {
    const months = window.prompt("Kaç aylık abonelik tanımlansın?", "12");
    if (!months) return;
    const ends = new Date();
    ends.setMonth(ends.getMonth() + (parseInt(months, 10) || 12));
    const iso = ends.toISOString();
    setTenants((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, plan: "full", subscription_ends_at: iso } : x))
    );
    startTransition(async () => {
      const r = await updateTenantStatus({ id: t.id, plan: "full", subscription_ends_at: iso });
      if (!r.ok) flash(r.error ?? "Güncellenemedi");
    });
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold italic">İşletmeler</h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {tenants.length} işletme · abonelik takibi manuel (ödeme entegrasyonu v2)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="shrink-0 rounded-full bg-accent px-4 py-2.5 text-[13px] font-extrabold text-accent-fg active:scale-95"
        >
          + İşletme
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-danger/12 px-4 py-3 text-[13px] font-semibold text-danger">{error}</p>
      )}

      <div className="space-y-3">
        {tenants.map((t) => {
          const expiry = t.plan === "full" ? t.subscription_ends_at : t.trial_ends_at;
          const expired = expiry ? new Date(expiry).getTime() < Date.now() : false;
          return (
            <div
              key={t.id}
              className={`rounded-2xl border border-line bg-card p-4 ${t.is_active ? "" : "opacity-60"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[15px] font-extrabold">
                    {t.name}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        t.plan === "full" ? "bg-accent text-accent-fg" : "bg-surface-2 text-ink-2"
                      }`}
                    >
                      {t.plan === "full" ? "Abone" : "Deneme"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-2">
                    <Link href={`/${t.slug}`} target="_blank" className="text-accent hover:underline">
                      /{t.slug}
                    </Link>{" "}
                    · {t.product_count} ürün ·{" "}
                    <span className={expired ? "font-bold text-danger" : ""}>
                      {t.plan === "full" ? "abonelik" : "deneme"} bitiş: {fmtDate(expiry)}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {t.plan === "trial" && (
                    <button
                      type="button"
                      onClick={() => activateFull(t)}
                      className="rounded-full border border-accent px-3 py-1.5 text-[11px] font-extrabold text-accent active:scale-95"
                    >
                      Aboneliğe Geçir
                    </button>
                  )}
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-ink-2">
                    <input
                      type="checkbox"
                      checked={t.is_active}
                      onChange={(e) => toggleActive(t, e.target.checked)}
                      className="h-4 w-4 accent-(--mq-accent)"
                    />
                    Yayında
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <TenantWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={(t) => setTenants((p) => [t, ...p])} />
    </div>
  );
}

/* ---------------- yeni işletme sihirbazı ---------------- */

function TenantWizard({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (t: PlatformTenant) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [trialDays, setTrialDays] = useState("30");
  const [whatsapp, setWhatsapp] = useState("");
  const [result, setResult] = useState<{ slug: string; password: string; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const r = await createTenant({
        name,
        slug,
        owner_email: email,
        trial_days: trialDays,
        whatsapp_phone: whatsapp || null,
      });
      if (!r.ok || !r.ownerPassword || !r.slug) {
        setError(r.error ?? "Oluşturulamadı");
        return;
      }
      onCreated({
        id: crypto.randomUUID(), // liste yenilenince gerçek id gelir; görsel amaçlı
        slug: r.slug,
        name,
        is_active: true,
        plan: "trial",
        trial_ends_at: new Date(Date.now() + (parseInt(trialDays, 10) || 30) * 86400_000).toISOString(),
        subscription_ends_at: null,
        created_at: new Date().toISOString(),
        product_count: 0,
      });
      setResult({ slug: r.slug, password: r.ownerPassword, email });
    });
  };

  const reset = () => {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setEmail("");
    setTrialDays("30");
    setWhatsapp("");
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && reset()}>
      <DialogContent data-mode="dark" className="dark border-line bg-surface text-ink sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display italic">
            {result ? "İşletme Hazır 🎉" : "Yeni İşletme"}
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <p className="text-[14px] text-ink-2">
              Bu bilgileri işletmeciye ilet — <strong className="text-danger">şifre bir daha gösterilmez:</strong>
            </p>
            <div className="space-y-2 rounded-2xl border border-accent/40 bg-accent/8 p-4 text-[14px]">
              <p>
                <span className="text-ink-2">Menü:</span>{" "}
                <span className="font-bold text-accent">/{result.slug}</span>
              </p>
              <p>
                <span className="text-ink-2">Panel:</span> <span className="font-bold">/admin/login</span>
              </p>
              <p>
                <span className="text-ink-2">E-posta:</span> <span className="font-bold">{result.email}</span>
              </p>
              <p>
                <span className="text-ink-2">Geçici şifre:</span>{" "}
                <code className="rounded bg-surface-2 px-2 py-0.5 font-bold text-accent">{result.password}</code>
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-xl bg-accent py-3 text-[14px] font-extrabold text-accent-fg"
            >
              Tamam
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="İşletme adı *">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                className={inputCls}
                placeholder="Lezzet Durağı"
              />
            </Field>
            <Field label="Slug (menü adresi) *">
              <div className="flex items-center gap-1">
                <span className="text-[13px] text-ink-2">/</span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  className={inputCls}
                  placeholder="lezzet-duragi"
                />
              </div>
            </Field>
            <Field label="İşletmeci e-postası * (panel girişi)">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputCls} placeholder="sahip@isletme.com" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Deneme süresi (gün)">
                <input value={trialDays} onChange={(e) => setTrialDays(e.target.value)} inputMode="numeric" className={inputCls} />
              </Field>
              <Field label="WhatsApp (sipariş için)">
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputCls} placeholder="+90555…" />
              </Field>
            </div>

            {error && (
              <p className="rounded-xl bg-danger/12 px-3 py-2.5 text-[13px] font-semibold text-danger">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={reset} className="rounded-xl border border-line-strong px-4 py-2.5 text-[13px] font-bold">
                Vazgeç
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !name.trim() || !slug.trim() || !email.trim()}
                className="rounded-xl bg-accent px-5 py-2.5 text-[13px] font-extrabold text-accent-fg disabled:opacity-50"
              >
                {pending ? "Oluşturuluyor…" : "Oluştur"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-line-strong bg-card px-3 text-[14px] outline-none transition-colors focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-2">{label}</span>
      {children}
    </label>
  );
}
