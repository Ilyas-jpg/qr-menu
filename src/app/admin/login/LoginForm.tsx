"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthState } from "../_actions/auth";

const initialState: AuthState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const urlError = params.get("error");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-[12px] font-bold uppercase tracking-wider text-ink-2">
          E-posta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className="h-12 w-full rounded-xl border border-line-strong bg-card px-4 text-[15px] outline-none transition-colors focus:border-accent"
          placeholder="ornek@isletme.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-[12px] font-bold uppercase tracking-wider text-ink-2">
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-12 w-full rounded-xl border border-line-strong bg-card px-4 text-[15px] outline-none transition-colors focus:border-accent"
          placeholder="••••••••"
        />
      </div>

      {(state.error || urlError === "uyelik") && (
        <p className="rounded-xl bg-danger/12 px-4 py-3 text-[13px] font-semibold text-danger">
          {state.error ?? "Bu hesaba bağlı bir işletme bulunamadı."}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-accent text-[15px] font-extrabold text-accent-fg transition-transform active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
    </form>
  );
}
