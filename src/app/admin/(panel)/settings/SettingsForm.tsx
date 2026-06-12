"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { AdminTenant } from "@/lib/auth";
import { updateTenantSettings } from "@/app/admin/_actions/settings";

/** Hazır accent paleti — canlı/yüksek kontrast (krem-pastel yok) */
const ACCENT_PRESETS = ["#C8A24B", "#E2574C", "#2DB4A8", "#D4722C", "#7C5CC4", "#3E8FD8"];

export function SettingsForm({ tenant }: { tenant: AdminTenant }) {
  const [name, setName] = useState(tenant.name);
  const [address, setAddress] = useState(tenant.address ?? "");
  const [phone, setPhone] = useState(tenant.phone ?? "");
  const [instagram, setInstagram] = useState(tenant.instagram_url ?? "");
  const [maps, setMaps] = useState(tenant.google_maps_url ?? "");
  const [wifiSsid, setWifiSsid] = useState(tenant.wifi_ssid ?? "");
  const [wifiPass, setWifiPass] = useState(tenant.wifi_password ?? "");
  const [whatsapp, setWhatsapp] = useState(tenant.whatsapp_phone ?? "");
  const [mode, setMode] = useState<"dark" | "light">(tenant.theme?.mode === "light" ? "light" : "dark");
  const [accent, setAccent] = useState(tenant.theme?.accent ?? "#C8A24B");
  const [english, setEnglish] = useState(tenant.languages.includes("en"));
  const [waiterCall, setWaiterCall] = useState(tenant.settings.waiter_call_enabled !== false);
  const [billRequest, setBillRequest] = useState(tenant.settings.bill_request_enabled !== false);
  const [showCalories, setShowCalories] = useState(tenant.settings.show_calories === true);
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const r = await updateTenantSettings({
        name,
        address: address || null,
        phone: phone || null,
        instagram_url: instagram || null,
        google_maps_url: maps || null,
        wifi_ssid: wifiSsid || null,
        wifi_password: wifiPass || null,
        whatsapp_phone: whatsapp || null,
        theme: { mode, accent },
        english_enabled: english,
        waiter_call_enabled: waiterCall,
        bill_request_enabled: billRequest,
        show_calories: showCalories,
      });
      if (r.ok) toast.success("Ayarlar kaydedildi — menü anında güncellendi");
      else toast.error(r.error ?? "Kaydedilemedi");
    });
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold italic">Ayarlar</h1>
      <p className="mt-0.5 text-[13px] text-ink-2">
        Değişiklikler kaydedince menüye anında yansır
      </p>

      <div className="mt-5 space-y-4">
        <Section title="İşletme">
          <Field label="İşletme adı *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Adres">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefon">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+90…" />
            </Field>
            <Field label="Instagram">
              <input value={instagram} onChange={(e) => setInstagram(e.target.value)} className={inputCls} placeholder="https://instagram.com/…" />
            </Field>
          </div>
          <Field label="Google Maps bağlantısı (Yol Tarifi butonu)">
            <input value={maps} onChange={(e) => setMaps(e.target.value)} className={inputCls} placeholder="https://maps.google.com/…" />
          </Field>
        </Section>

        <Section title="Wi-Fi Kartı" hint="Boş bırakılırsa menüde gösterilmez">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ağ adı (SSID)">
              <input value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Şifre">
              <input value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Section>

        <Section title="Özellikler" hint="İşletmenize uymayan özellikleri kapatın">
          <Toggle
            checked={waiterCall}
            onChange={setWaiterCall}
            label="🔔 Garson çağırma"
            desc="Masa QR'ı ile gelen müşteri tek dokunuşla garson çağırabilir"
          />
          <Toggle
            checked={billRequest}
            onChange={setBillRequest}
            label="🧾 Hesap isteme"
            desc="Müşteri hesabı masadan isteyebilir"
          />
          <Toggle
            checked={Boolean(whatsapp)}
            onChange={(v) => !v && setWhatsapp("")}
            label="💬 WhatsApp sipariş"
            desc={whatsapp ? `Siparişler ${whatsapp} numarasına gider` : "Açmak için aşağıya numara girin"}
            readOnlyOn
          />
          <Field label="WhatsApp numarası (boş = sipariş kapalı)">
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputCls} placeholder="+905xxxxxxxxx" />
          </Field>
          <Toggle
            checked={showCalories}
            onChange={setShowCalories}
            label="🔥 Kalori bilgisi"
            desc="Ürün detayında kalori gösterilir"
          />
          <Toggle
            checked={english}
            onChange={setEnglish}
            label="🇬🇧 İngilizce menü"
            desc="Menüde TR/EN dil değiştirici görünür (EN içerikleri ürünlerde doldurun)"
          />
        </Section>

        <Section title="Görünüm">
          <Field label="Tema">
            <div className="flex gap-1.5">
              {([["dark", "Koyu (önerilen)"], ["light", "Açık"]] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMode(v)}
                  aria-pressed={mode === v}
                  className={`flex-1 rounded-xl border py-2.5 text-[13px] font-bold ${
                    mode === v ? "border-accent bg-accent/15 text-accent" : "border-line text-ink-2"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Vurgu rengi (fiyatlar, butonlar, rozetler)">
            <div className="flex items-center gap-2">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccent(c)}
                  aria-label={c}
                  className={`h-9 w-9 rounded-full border-2 transition-transform active:scale-90 ${
                    accent.toLowerCase() === c.toLowerCase() ? "scale-110 border-ink" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                aria-label="Özel renk"
                className="h-9 w-9 cursor-pointer rounded-full border border-line-strong bg-transparent"
              />
            </div>
          </Field>
        </Section>

        <button
          type="button"
          onClick={save}
          disabled={pending || !name.trim()}
          className="w-full rounded-2xl bg-accent py-3.5 text-[15px] font-extrabold text-accent-fg active:scale-[0.99] disabled:opacity-50"
        >
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-line-strong bg-card px-3 text-[14px] outline-none transition-colors focus:border-accent";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent">{title}</h2>
        {hint && <span className="text-[11px] text-ink-2">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-2">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  desc,
  readOnlyOn,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
  /** true: yalnız kapatma yönü etkileşimli (açma başka alandan) */
  readOnlyOn?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-line px-3.5 py-3">
      <span>
        <span className="block text-[14px] font-bold">{label}</span>
        <span className="mt-0.5 block text-[12px] text-ink-2">{desc}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={readOnlyOn && !checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-9 accent-(--mq-accent)"
      />
    </label>
  );
}
