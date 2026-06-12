import Link from "next/link";

export default function NotFound() {
  return (
    <div
      data-mode="dark"
      className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center text-ink"
    >
      <p className="font-display text-7xl font-semibold italic text-accent">404</p>
      <h1 className="mt-4 text-xl font-bold">Menü bulunamadı</h1>
      <p className="mt-2 max-w-sm text-[14px] text-ink-2">
        Aradığınız işletme menüsü yayında değil ya da adres hatalı.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full border border-line-strong px-5 py-2.5 text-[13px] font-bold hover:border-accent"
      >
        Ana sayfa
      </Link>
    </div>
  );
}
