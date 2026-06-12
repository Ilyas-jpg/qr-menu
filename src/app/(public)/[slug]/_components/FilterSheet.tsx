"use client";

import type { AllergenKey, DietaryKey, Lang } from "@/lib/types";
import { ALLERGENS, DIETARY } from "@/lib/constants";
import { t, ui } from "@/lib/i18n";

export interface MenuFilters {
  dietary: DietaryKey[];
  excludeAllergens: AllergenKey[];
}

export const EMPTY_FILTERS: MenuFilters = { dietary: [], excludeAllergens: [] };

interface Props {
  open: boolean;
  filters: MenuFilters;
  lang: Lang;
  onChange: (f: MenuFilters) => void;
  onClose: () => void;
}

/** Beslenme tercihi + alerjen hariç tutma — misafir tarafı filtre sheet'i */
export function FilterSheet({ open, filters, lang, onChange, onClose }: Props) {
  if (!open) return null;

  const toggleDiet = (d: DietaryKey) =>
    onChange({
      ...filters,
      dietary: filters.dietary.includes(d)
        ? filters.dietary.filter((x) => x !== d)
        : [...filters.dietary, d],
    });

  const toggleAllergen = (a: AllergenKey) =>
    onChange({
      ...filters,
      excludeAllergens: filters.excludeAllergens.includes(a)
        ? filters.excludeAllergens.filter((x) => x !== a)
        : [...filters.excludeAllergens, a],
    });

  const activeCount = filters.dietary.length + filters.excludeAllergens.length;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={ui("filters", lang)}>
      <button
        type="button"
        aria-label={ui("close", lang)}
        onClick={onClose}
        className="mq-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />
      <div className="mq-sheet absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl rounded-t-3xl border border-line-strong bg-surface shadow-2xl">
        <div className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-ink-2/40" />
        <div className="max-h-[80dvh] space-y-5 overflow-y-auto px-5 pb-8 pt-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold italic">{ui("filters", lang)}</h2>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="text-[12px] font-bold uppercase tracking-wider text-accent underline-offset-4 hover:underline"
              >
                {ui("clearFilters", lang)} ({activeCount})
              </button>
            )}
          </div>

          {/* Beslenme tercihi */}
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent">
                {ui("dietary", lang)}
              </h3>
              <div className="mq-rule flex-1" />
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DIETARY) as DietaryKey[]).map((d) => {
                const active = filters.dietary.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleDiet(d)}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
                      active
                        ? "bg-accent text-accent-fg"
                        : "border border-line-strong text-ink hover:border-accent/60"
                    }`}
                  >
                    {t(DIETARY[d].label, lang)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alerjen hariç tut */}
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent">
                {ui("excludeAllergens", lang)}
              </h3>
              <div className="mq-rule flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(ALLERGENS) as AllergenKey[]).map((a) => {
                const active = filters.excludeAllergens.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleAllergen(a)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
                      active
                        ? "border-danger/60 bg-danger/10 text-danger"
                        : "border-line text-ink hover:border-line-strong"
                    }`}
                  >
                    <span aria-hidden>{ALLERGENS[a].emoji}</span>
                    <span className="truncate">{t(ALLERGENS[a].label, lang)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-accent py-3.5 text-[15px] font-extrabold text-accent-fg active:scale-[0.99]"
          >
            {ui("close", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Filtre + arama uygulaması (saf) */
export function productMatches(
  p: { name: { tr: string; en?: string | null }; description: { tr: string; en?: string | null } | null; dietary: DietaryKey[]; allergens: AllergenKey[] },
  filters: MenuFilters,
  query: string,
  lang: Lang
): boolean {
  if (filters.dietary.length > 0 && !filters.dietary.every((d) => p.dietary.includes(d))) return false;
  if (filters.excludeAllergens.some((a) => p.allergens.includes(a))) return false;
  if (query.trim()) {
    const q = query.toLocaleLowerCase("tr-TR");
    const hay = `${t(p.name, lang)} ${t(p.description, lang)}`.toLocaleLowerCase("tr-TR");
    if (!hay.includes(q)) return false;
  }
  return true;
}
