import type { CSSProperties } from "react";

/**
 * "Sahil" temasının arka plan katmanı — İzmir kıyı kafesi imgesi:
 * alçalan güneş kursu, iki palmiye yaprağı silüeti ve ufuk dalgaları.
 *
 * Tamamen dekoratif: aria-hidden + pointer-events-none, içeriğin ALTINDA (z-0).
 * Şekiller runtime'da path olarak üretilir (harici asset/istek yok, ~2KB HTML).
 */

type Pt = [number, number];

/** Kübik Bézier üzerinde nokta */
function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const [a, b, c, d] = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

/** Aynı eğrinin teğeti (türev) — yaprakçıkların açısı buradan gelir */
function tangent(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const x =
    3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const y =
    3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  const len = Math.hypot(x, y) || 1;
  return [x / len, y / len];
}

const n2 = (n: number) => Math.round(n * 10) / 10;

/**
 * Palmiye yaprağı: kavisli sap + iki yana açılan, uca doğru kısalan yaprakçıklar.
 * Dolgu yerine yuvarlak uçlu stroke — silüet böyle daha zarif, daha az "klipart".
 */
function PalmFrond({
  length = 260,
  leaflets = 15,
  className = "",
  style,
}: {
  length?: number;
  leaflets?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const p0: Pt = [0, 0];
  const p1: Pt = [length * 0.34, -length * 0.04];
  const p2: Pt = [length * 0.72, -length * 0.16];
  const p3: Pt = [length, -length * 0.36];

  const stem = `M0 0 C ${n2(p1[0])} ${n2(p1[1])}, ${n2(p2[0])} ${n2(p2[1])}, ${n2(p3[0])} ${n2(p3[1])}`;

  const blades: string[] = [];
  for (let i = 1; i <= leaflets; i++) {
    const t = i / (leaflets + 1);
    const b = bezier(p0, p1, p2, p3, t);
    const [tx, ty] = tangent(p0, p1, p2, p3, t);
    const nx = -ty;
    const ny = tx;
    // Uzunluk ortada tepe yapar, uca doğru sönümlenir; hafif düzensizlik =
    // organik his (rastgele değil, deterministik — SSR/hydration aynı çıksın)
    const jitter = 1 + 0.09 * Math.sin(i * 2.3);
    const L = length * 0.42 * Math.pow(Math.sin(Math.PI * t), 0.45) * (1 - 0.25 * t) * jitter;

    for (const side of [1, -1]) {
      // Yaprakçık öne yatar (uca doğru) ve ucunda hafifçe aşağı düşer — palmiye
      // yaprağını eğrelti otundan ayıran şey bu süpürme hareketi
      const droop = side > 0 ? 0.1 : 0.16;
      const ex = b[0] + nx * side * L * 0.5 + tx * L * 0.92;
      const ey = b[1] + ny * side * L * 0.5 + ty * L * 0.92 + L * droop;

      // Dolgu silüeti: taban→uç iki yaylı ince mekik. Stroke çizgi uzaktan
      // "çizik" gibi okunuyor; dolgu gerçek yaprak kütlesi veriyor.
      const dx = ex - b[0];
      const dy = ey - b[1];
      const dl = Math.hypot(dx, dy) || 1;
      const px = -(dy / dl);
      const py = dx / dl;
      const w = L * 0.11;
      const m: Pt = [b[0] + dx * 0.45, b[1] + dy * 0.45];
      blades.push(
        `M ${n2(b[0])} ${n2(b[1])} Q ${n2(m[0] + px * w)} ${n2(m[1] + py * w)}, ${n2(ex)} ${n2(ey)} Q ${n2(m[0] - px * w * 0.55)} ${n2(m[1] - py * w * 0.55)}, ${n2(b[0])} ${n2(b[1])} Z`
      );
    }
  }

  return (
    <svg
      viewBox={`-10 ${-length * 0.42} ${length + 20} ${length * 0.85}`}
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden
    >
      <path
        d={stem}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      {blades.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/** Ufuk çizgisi: sönümlenen sinüs — deniz yüzeyi */
function wavePath(width: number, y: number, amp: number, waves: number): string {
  const pts: string[] = [];
  for (let x = 0; x <= width; x += 8) {
    const yy = y + Math.sin((x / width) * Math.PI * 2 * waves) * amp;
    pts.push(`${x === 0 ? "M" : "L"} ${x} ${n2(yy)}`);
  }
  return pts.join(" ");
}

export function SeasideDecor() {
  return (
    <>
      {/* ---- ÜST BANT: gün batımı göğü + güneş + palmiyeler ---- */}
      <div
        aria-hidden
        data-decor="top"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[440px] overflow-hidden text-accent"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, #000 60%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, #000 60%, transparent 100%)",
        }}
      >
        {/* Gökyüzü yıkaması — kremin üstüne ince bir sıcaklık katmanı */}
        <div
          className="absolute inset-x-0 top-0 h-[300px]"
          style={{
            background:
              "linear-gradient(180deg, rgb(var(--mq-accent-rgb) / 0.22) 0%, rgb(var(--mq-accent-rgb) / 0.08) 48%, transparent 100%)",
          }}
        />
        {/* Alçalan güneş — sağ üstten sahneyi ısıtır */}
        <div
          className="absolute -right-20 -top-24 h-[360px] w-[360px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgb(var(--mq-accent-rgb) / 0.34) 0%, rgb(var(--mq-accent-rgb) / 0.12) 45%, transparent 72%)",
          }}
        />

        {/* Sol üst palmiye: sap köşenin dışında kalır, uç kadraja girer */}
        <PalmFrond
          length={340}
          leaflets={12}
          className="absolute -left-20 -top-14 w-[340px] opacity-[0.24]"
          style={{ transform: "rotate(26deg)", transformOrigin: "0% 60%" }}
        />
        {/* Sağ üstte karşı yönde, daha küçük ve daha aşağıda — üst üste binmesin */}
        <PalmFrond
          length={230}
          leaflets={10}
          className="absolute -right-28 top-[128px] w-[230px] opacity-[0.16]"
          style={{ transform: "scaleX(-1) rotate(26deg)", transformOrigin: "0% 60%" }}
        />
      </div>

      {/* ---- ALT BANT: sayfa sonunda ufuk + tek palmiye (motif geri döner) ---- */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[260px] overflow-hidden text-accent"
        style={{
          WebkitMaskImage: "linear-gradient(to top, #000 65%, transparent 100%)",
          maskImage: "linear-gradient(to top, #000 65%, transparent 100%)",
        }}
      >
        <PalmFrond
          length={240}
          leaflets={13}
          className="absolute -left-16 bottom-2 w-[240px] opacity-[0.16]"
          style={{ transform: "rotate(-18deg)" }}
        />
        <svg
          viewBox="0 0 390 54"
          preserveAspectRatio="none"
          fill="none"
          stroke="currentColor"
          className="absolute inset-x-0 bottom-0 h-14 w-full opacity-[0.3]"
        >
          <path d={wavePath(390, 10, 4, 2)} strokeWidth={1.6} />
          <path d={wavePath(390, 28, 3, 3)} strokeWidth={1.2} opacity={0.7} />
          <path d={wavePath(390, 44, 2, 4)} strokeWidth={1} opacity={0.45} />
        </svg>
      </div>
    </>
  );
}
