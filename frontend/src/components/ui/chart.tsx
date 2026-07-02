'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card } from '@/components/ui/card';

type Point = { label: string; value: number };

function ChartHeader({ label, subtitle }: { label: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-black text-foreground">{label}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ value?: number }>;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-xl">
      <p className="font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 font-black text-popover-foreground">{payload[0]?.value ?? 0}</p>
    </div>
  );
}

export function ShadcnBarChart({
  data,
  label,
  subtitle,
}: {
  data: Point[];
  label: string;
  subtitle?: string;
}) {
  return (
    <Card className="overflow-hidden p-5">
      <ChartHeader label={label} subtitle={subtitle} />
      <div className="h-72 w-full" dir="ltr">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart accessibilityLayer data={data} margin={{ left: 8, right: 8, top: 24 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)' }} />
            <Bar dataKey="value" fill="var(--brand-accent)" radius={[6, 6, 0, 0]}>
              <LabelList
                dataKey="value"
                fill="var(--foreground)"
                fontSize={12}
                fontWeight={900}
                position="top"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function ShadcnAreaChart({
  data,
  label,
  subtitle,
}: {
  data: Point[];
  label: string;
  subtitle?: string;
}) {
  const gradientId = `area-${label.replace(/[^a-zA-Z0-9]/g, '-') || 'chart'}`;

  return (
    <Card className="overflow-hidden p-5">
      <ChartHeader label={label} subtitle={subtitle} />
      <div className="h-72 w-full" dir="ltr">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart accessibilityLayer data={data} margin={{ left: 8, right: 8, top: 12 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<ChartTooltip />} cursor={false} />
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="var(--brand-accent)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--brand-accent)" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <Area
              dataKey="value"
              fill={`url(#${gradientId})`}
              fillOpacity={0.55}
              stroke="var(--brand-accent)"
              strokeWidth={3}
              type="natural"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function ShadcnLineChart({
  data,
  label,
  subtitle,
}: {
  data: Point[];
  label: string;
  subtitle?: string;
}) {
  return (
    <Card className="overflow-hidden p-5">
      <ChartHeader label={label} subtitle={subtitle} />
      <div className="h-72 w-full" dir="ltr">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart accessibilityLayer data={data} margin={{ left: 8, right: 16, top: 16 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              domain={['dataMin - 2', 'dataMax + 2']}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              tickLine={false}
              width={38}
            />
            <Tooltip content={<ChartTooltip />} cursor={false} />
            <Line
              activeDot={{ fill: 'var(--foreground)', r: 6 }}
              dataKey="value"
              dot={{ fill: 'var(--brand-accent)', r: 5, strokeWidth: 0 }}
              stroke="var(--brand-accent)"
              strokeWidth={3}
              type="natural"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function ShadcnDonutChart({
  data,
  label,
  subtitle,
}: {
  data: Array<{ color: string; label: string; value: number }>;
  label: string;
  subtitle?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="overflow-hidden p-5">
      <ChartHeader label={label} subtitle={subtitle} />
      <div className="grid gap-4 sm:grid-cols-[15rem_1fr] sm:items-center">
        <div className="h-60 w-full" dir="ltr">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart accessibilityLayer>
              <Tooltip content={<ChartTooltip />} />
              <Pie
                data={data}
                dataKey="value"
                innerRadius={72}
                nameKey="label"
                outerRadius={102}
                stroke="var(--card)"
                strokeWidth={4}
              >
                {data.map((item) => (
                  <Cell fill={item.color} key={item.label} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) return null;
                    return (
                      <text textAnchor="middle" x={viewBox.cx} y={viewBox.cy}>
                        <tspan
                          className="fill-foreground text-3xl font-black"
                          x={viewBox.cx}
                          y={viewBox.cy}
                        >
                          {total}
                        </tspan>
                        <tspan
                          className="fill-muted-foreground text-xs font-bold"
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 22}
                        >
                          إجمالي الحالات
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-2">
          {data.map((item) => (
            <div
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
              key={item.label}
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <span className="font-black">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export const MiniBarChart = ShadcnBarChart;
export const PremiumBarChart3D = ShadcnBarChart;
export const PremiumAreaChart = ShadcnAreaChart;
export const TrendLine = ShadcnLineChart;
export const StatusDonutChart = ShadcnDonutChart;
