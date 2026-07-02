'use client';

import { Activity, BellRing, TimerReset, TrendingUp } from 'lucide-react';
import { LabelList, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Card, CardTitle } from '@/components/ui/card';

type ChartDatum = {
  fill: string;
  label: string;
  score: number;
  unit: string;
  value: number;
};

export function MemberRadialLabelChart({
  attendance,
  remainingDays,
  requests,
}: {
  attendance: number;
  remainingDays: number;
  requests: number;
}) {
  const chartData: ChartDatum[] = [
    {
      fill: '#22ff00',
      label: 'الحضور',
      score: Math.max(10, Math.min(100, (attendance / 24) * 100)),
      unit: 'زيارة',
      value: attendance,
    },
    {
      fill: '#22c55e',
      label: 'الأيام',
      score: Math.max(10, Math.min(100, (remainingDays / 30) * 100)),
      unit: 'يوم',
      value: remainingDays,
    },
    {
      fill: '#166534',
      label: 'الطلبات',
      score: Math.max(10, Math.min(100, (requests / 4) * 100)),
      unit: 'طلب',
      value: requests,
    },
  ];

  const summaries = [
    { icon: Activity, label: 'الحضور', unit: 'زيارة', value: attendance },
    { icon: TimerReset, label: 'المتبقي', unit: 'يوم', value: remainingDays },
    { icon: BellRing, label: 'المتابعة', unit: 'طلب', value: requests },
  ];

  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="border-b border-border px-5 pb-4 pt-5 text-center">
        <CardTitle>مؤشرات العضو</CardTitle>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          الحضور والاشتراك وطلبات المتابعة
        </p>
      </div>

      <div className="flex-1 pb-0">
        <div className="mx-auto aspect-square max-h-[300px] min-h-[270px] w-full max-w-[340px]">
          <ResponsiveContainer height="100%" width="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              data={chartData}
              endAngle={380}
              innerRadius={34}
              outerRadius={126}
              startAngle={-90}
            >
              <Tooltip
                content={({ active, payload }) => {
                  const datum = payload?.[0]?.payload as ChartDatum | undefined;
                  if (!active || !datum) return null;

                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-xl">
                      <p className="font-black">{datum.label}</p>
                      <p className="mt-1 text-muted-foreground">
                        {datum.value} {datum.unit}
                      </p>
                    </div>
                  );
                }}
                cursor={false}
              />
              <RadialBar background cornerRadius={7} dataKey="score">
                <LabelList
                  className="fill-white font-black mix-blend-luminosity"
                  dataKey="label"
                  fontSize={11}
                  position="insideStart"
                />
              </RadialBar>
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-2 px-4 pb-4 sm:grid-cols-3">
        {summaries.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/25 p-3"
              key={item.label}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-black"
                style={{ backgroundColor: chartData[index]?.fill }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-black">
                  {item.value} <span className="text-xs text-muted-foreground">{item.unit}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-border px-4 py-4 text-sm">
        <div className="flex items-center gap-2 font-black">
          بيانات حسابك محدثة مباشرة
          <TrendingUp className="h-4 w-4 text-brand-accent-foreground" />
        </div>
        <p className="text-xs font-semibold text-muted-foreground">مرر فوق أي دائرة لعرض القيمة</p>
      </div>
    </Card>
  );
}
