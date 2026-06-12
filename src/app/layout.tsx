import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// iOS: çentik/status bar bölgesi tema rengini alsın, içerik safe-area'ya tassın
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0d",
};

// Tek display + tek gövde: ikisi de variable, latin-ext (Türkçe karakter şart).
// shadcn'in --font-sans'ı da Manrope'a bağlı (globals.css @theme) — üçüncü font YOK (LCP bütçesi).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "QR Menü",
  description: "Dijital karekod menü platformu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={cn("h-full antialiased", fraunces.variable, manrope.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
