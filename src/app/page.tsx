import Link from "next/link";

/** Platform kök sayfası — v1'de minimal vitrin; satış sayfası ileride */
export default function Home() {
  return (
    <div
      data-mode="dark"
      className="mq-grain flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center text-ink"
    >
      <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-accent">
        Dijital Menü Platformu
      </p>
      <h1 className="font-display mt-4 text-5xl font-semibold italic tracking-tight">
        QR Menü
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-2">
        Restoran ve kafeler için hızlı, şık, yönetilebilir karekod menü.
      </p>
      <Link
        href="/safran-sofrasi"
        className="mt-8 rounded-full bg-accent px-6 py-3 text-[14px] font-extrabold text-accent-fg transition-transform active:scale-95"
      >
        Demo menüyü gör →
      </Link>
    </div>
  );
}
