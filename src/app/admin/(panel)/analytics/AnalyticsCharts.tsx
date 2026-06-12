"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  series: { day: string; views: number }[];
  topProducts: { name: string; uniques: number }[];
}

const tooltipStyle = {
  background: "var(--mq-card)",
  border: "1px solid var(--mq-line-strong)",
  borderRadius: 12,
  color: "var(--mq-text)",
  fontSize: 12,
  fontWeight: 700,
};

export function AnalyticsCharts({ series, topProducts }: Props) {
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <div className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent">
          30 Günlük Görüntülenme
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={series} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid stroke="var(--mq-line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "var(--mq-text-2)", fontSize: 10 }} interval={4} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "var(--mq-text-2)", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--mq-text-2)" }} />
            <Line type="monotone" dataKey="views" name="Görüntülenme" stroke="var(--mq-accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent">
          En Çok İlgi Gören Ürünler (7g, tekil)
        </h2>
        {topProducts.length === 0 ? (
          <p className="flex h-[220px] items-center justify-center text-center text-[13px] text-ink-2">
            Henüz yeterli veri yok
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: "var(--mq-text)", fontSize: 11, fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgb(var(--mq-accent-rgb) / 0.08)" }} />
              <Bar dataKey="uniques" name="Tekil görüntülenme" fill="var(--mq-accent)" radius={[0, 8, 8, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
