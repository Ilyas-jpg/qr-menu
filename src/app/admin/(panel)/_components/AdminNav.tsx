"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminRealtime } from "./AdminRealtimeProvider";

const TENANT_ITEMS = [
  { href: "/admin", label: "Panel", icon: "▦" },
  { href: "/admin/menu", label: "Menü", icon: "🍽" },
  { href: "/admin/campaigns", label: "Kampanya", icon: "％" },
  { href: "/admin/tables", label: "Masalar", icon: "▣" },
  { href: "/admin/requests", label: "Çağrılar", icon: "🔔" },
  { href: "/admin/analytics", label: "Analitik", icon: "📈" },
  { href: "/admin/settings", label: "Ayarlar", icon: "⚙" },
] as const;

const PLATFORM_ITEMS = [{ href: "/admin/platform", label: "İşletmeler", icon: "🏪" }] as const;

interface Props {
  role: "owner" | "staff" | "platform_admin";
  orientation: "vertical" | "horizontal";
}

export function AdminNav({ role, orientation }: Props) {
  const pathname = usePathname();
  const { pendingCount } = useAdminRealtime();
  const items =
    role === "platform_admin" ? PLATFORM_ITEMS : TENANT_ITEMS;

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const badge = (href: string) =>
    href === "/admin/requests" && pendingCount > 0 ? (
      <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-black text-white">
        {pendingCount > 9 ? "9+" : pendingCount}
      </span>
    ) : null;

  if (orientation === "horizontal") {
    return (
      <div className="flex items-stretch justify-around pb-[max(env(safe-area-inset-bottom),4px)]">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold ${
              isActive(item.href) ? "text-accent" : "text-ink-2"
            }`}
          >
            <span className="relative text-[17px] leading-none" aria-hidden>
              {item.icon}
              {badge(item.href)}
            </span>
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-bold transition-colors ${
            isActive(item.href)
              ? "bg-accent/12 text-accent"
              : "text-ink-2 hover:bg-surface-2 hover:text-ink"
          }`}
        >
          <span aria-hidden className="relative w-5 text-center">
            {item.icon}
            {badge(item.href)}
          </span>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
