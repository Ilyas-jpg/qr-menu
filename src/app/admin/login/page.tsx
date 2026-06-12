import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Yönetici Girişi — QR Menü" };

export default function LoginPage() {
  return (
    <div
      data-mode="dark"
      className="dark mq-grain flex min-h-dvh items-center justify-center bg-surface px-5 text-ink"
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-accent">
            QR Menü
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold italic">Yönetim Paneli</h1>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
