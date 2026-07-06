'use client';

import { Activity, BellRing, TimerReset, TrendingUp } from 'lucide-react';
import { LabelList, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Card, CardTitle } from '@/components/ui/card';
import { useMemberLocale } from '@/features/member/member-locale';

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
  const { text } = useMemberLocale();
  const chartData: ChartDatum[] = [
    {
      fill: '#22ff00',
      label: text('الحضور', 'Attendance'),
      score: Math.max(10, Math.min(100, (attendance / 24) * 100)),
      unit: text('زيارة', 'visits'),
      value: attendance,
    },
    {
      fill: '#22c55e',
      label: text('الأيام', 'Days'),
      score: Math.max(10, Math.min(100, (remainingDays / 30) * 100)),
      unit: text('يوم', 'days'),
      value: remainingDays,
    },
    {
      fill: '#166534',
      label: text('الطلبات', 'Requests'),
      score: Math.max(10, Math.min(100, (requests / 4) * 100)),
      unit: text('طلب', 'requests'),
      value: requests,
    },
  ];

  const summaries = [
    { icon: Activity, label: text('الحضور', 'Attendance'), unit: text('زيارة', 'visits'), value: attendance },
    { icon: TimerReset, label: text('المتبقي', 'Remaining'), unit: text('يوم', 'days'), value: remainingDays },
    { icon: BellRing, label: text('المتابعة', 'Follow-up'), unit: text('طلب', 'requests'), value: requests },
  ];

  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="border-b border-border px-5 pb-4 pt-5 text-center">
        <CardTitle>{text('مؤشرات العضو', 'Player indicators')}</CardTitle>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {text('الحضور والاشتراك وطلبات المتابعة', 'Attendance, membership, and follow-up requests')}
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
          {text('بيانات حسابك محدثة مباشرة', 'Your account data is updated live')}
          <TrendingUp className="h-4 w-4 text-brand-accent-foreground" />
        </div>
        <p className="text-xs font-semibold text-muted-foreground">{text('مرر فوق أي دائرة لعرض القيمة', 'Hover over a ring to view its value')}</p>
      </div>
    </Card>
  );
}
