import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { getMenu } from "@/lib/menu";
import { themeToCssVars } from "@/lib/theme";
import { evaluateMenu } from "@/lib/pricing";
import { RESERVED_SLUGS, imageSrc, imageSrcSet } from "@/lib/constants";
import { MenuExperience } from "./_components/MenuExperience";

/**
 * Public menü — ISR (eski model, cacheComponents kapalı):
 *  - revalidate=3600 emniyet kemeri; asıl tazeleme admin kaydında revalidateTag
 *  - deploy sonrası açılan tenant ilk istekte SSR olur, sonra cache'lenir
 *  - Masa QR'ları query param taşır (?m=5) → tenant başına TEK cache girdisi
 */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { slug } = await params;
  const menu = RESERVED_SLUGS.has(slug) ? null : await getMenu(slug);
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    // iOS status bar bölgesi tenant temasına uysun
    themeColor: menu?.tenant.theme?.mode === "light" ? "#ffffff" : "#0b0b0d",
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};
  const menu = await getMenu(slug);
  if (!menu) return { title: "Menü bulunamadı" };
  return {
    title: `${menu.tenant.name} — Menü`,
    description: menu.tenant.address ?? `${menu.tenant.name} dijital menü`,
    openGraph: { title: menu.tenant.name, type: "website" },
  };
}

export default async function MenuPage({ params }: Props) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();

  const menu = await getMenu(slug);
  if (!menu) notFound();

  const mode = menu.tenant.theme?.mode === "light" ? "light" : "dark";

  // Server'da değerlendirilen ilk durum: hydration cache'lenmiş HTML ile tutarlı kalır,
  // client mount sonrası gerçek saatle tazeler (MenuExperience içindeki effect)
  const initialEvaluated = evaluateMenu(menu.categories, menu.campaigns);

  // LCP adayı = ilk kategorinin ilk görselli ürün kartı (tam genişlik foto).
  // Preload: tarayıcı HTML'i parse edip <img>'i keşfetmeden indirmeye başlar (Slow-4G kazancı)
  const lcpImg = initialEvaluated[0]?.products.find((p) => p.images[0])?.images[0];
  if (lcpImg) {
    preload(imageSrc(lcpImg.file_stem, 640), {
      as: "image",
      fetchPriority: "high",
      imageSrcSet: imageSrcSet(lcpImg.file_stem),
      imageSizes: "(min-width: 768px) 310px, calc(100vw - 40px)",
    });
  }

  return (
    <div
      data-mode={mode}
      style={themeToCssVars(menu.tenant.theme)}
      className="mq-grain min-h-dvh bg-surface text-ink font-body"
    >
      <MenuExperience menu={menu} initialEvaluated={initialEvaluated} />
    </div>
  );
}
