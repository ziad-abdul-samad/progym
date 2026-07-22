'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, DollarSign, Download, FileText, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DashboardLoader, ErrorState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { apiRequest, jsonBody } from '@/lib/api/client';
import {
  downloadArabicGymReport,
  type GymReport,
  type ReportMetric,
} from '@/lib/reports/arabic-gym-report';
import { cn } from '@/lib/utils';

type ReportSettings = { membershipCurrency: string; monthlySubscriptionPriceMinor: number };
type Preset = 'day' | 'week' | 'month' | 'custom';

const metricOptions: Array<{ description: string; id: ReportMetric; label: string }> = [
  { description: 'الإجمالي والجدد ونسبة النمو', id: 'members', label: 'الأعضاء' },
  { description: 'الفعالة والجديدة وعمليات التجديد', id: 'subscriptions', label: 'الاشتراكات' },
  { description: 'الدفعات والإيراد ومتوسط الدفعة', id: 'revenue', label: 'الإيرادات' },
  { description: 'الزيارات والأعضاء والحركة اليومية', id: 'attendance', label: 'الحضور' },
  { description: 'عدد المدربين والإسنادات الفعالة', id: 'coaches', label: 'المدربون' },
  { description: 'المقبولة والمرفوضة وقيد الانتظار', id: 'registrations', label: 'طلبات التسجيل' },
];

function inputDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function presetRange(preset: Exclude<Preset, 'custom'>) {
  const today = new Date();
  const from = new Date(today);
  if (preset === 'week') from.setDate(today.getDate() - 6);
  if (preset === 'month') from.setDate(1);
  return { from: inputDate(from), to: inputDate(today) };
}

function Summary({ report }: { report: GymReport }) {
  return (
    <Card className="border-brand-accent/30 bg-brand-accent/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-brand-accent">آخر تقرير تم إنشاؤه</p>
          <h2 className="mt-1 text-xl font-black">
            {report.range.from} — {report.range.to}
          </h2>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
          جاهز وتم تنزيله PDF
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">الإيراد</p>
          <strong className="text-2xl">
            ${(report.revenue.totalMinor / 100).toLocaleString('en-US')}
          </strong>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">الأعضاء الجدد</p>
          <strong className="text-2xl">{report.members.new}</strong>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">الزيارات</p>
          <strong className="text-2xl">{report.attendance.visits}</strong>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">الاشتراكات الجديدة</p>
          <strong className="text-2xl">{report.subscriptions.started}</strong>
        </div>
      </div>
    </Card>
  );
}

export function AdminReportsPage() {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const initial = useMemo(() => presetRange('month'), []);
  const [preset, setPreset] = useState<Preset>('month');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [price, setPrice] = useState('25');
  const [metrics, setMetrics] = useState<ReportMetric[]>(metricOptions.map((item) => item.id));
  const [lastReport, setLastReport] = useState<GymReport | null>(null);
  const settings = useQuery({
    queryFn: () => apiRequest<ReportSettings>('/analytics/report-settings'),
    queryKey: ['analytics', 'report-settings'],
  });

  useEffect(() => {
    if (settings.data) setPrice(String(settings.data.monthlySubscriptionPriceMinor / 100));
  }, [settings.data]);

  const savePrice = useMutation({
    mutationFn: () =>
      apiRequest<ReportSettings>('/analytics/report-settings', {
        body: jsonBody({ monthlySubscriptionPriceMinor: Math.round(Number(price) * 100) }),
        method: 'PATCH',
      }),
    onError: (error: Error) =>
      push({ body: error.message, title: 'تعذر حفظ السعر', tone: 'error' }),
    onSuccess: (data) => {
      queryClient.setQueryData(['analytics', 'report-settings'], data);
      push({
        body: 'سيُطبق السعر الجديد على الاشتراكات والإضافات القادمة.',
        title: 'تم حفظ سعر الاشتراك',
        tone: 'success',
      });
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({ from, metrics: metrics.join(','), to });
      const report = await apiRequest<GymReport>(`/analytics/report?${params}`);
      await downloadArabicGymReport(report);
      return report;
    },
    onError: (error: Error) =>
      push({ body: error.message, title: 'تعذر إنشاء التقرير', tone: 'error' }),
    onSuccess: (report) => {
      setLastReport(report);
      push({ body: 'تم تجهيز وتنزيل ملف PDF العربي.', title: 'التقرير جاهز', tone: 'success' });
    },
  });

  const selectPreset = (next: Preset) => {
    setPreset(next);
    if (next !== 'custom') {
      const range = presetRange(next);
      setFrom(range.from);
      setTo(range.to);
    }
  };
  const toggleMetric = (metric: ReportMetric) =>
    setMetrics((current) =>
      current.includes(metric) ? current.filter((item) => item !== metric) : [...current, metric],
    );

  if (settings.isPending) return <DashboardLoader label="تحميل إعدادات التقارير..." />;
  if (settings.isError) return <ErrorState message={settings.error.message} />;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-brand-accent">
            <FileText className="h-4 w-4" /> مركز تقارير Pro Gym
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">التقارير المالية والتشغيلية</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            اختر الفترة والإحصاءات، ثم أنشئ ملف PDF عربي جاهز للحفظ أو الطباعة بشعار النادي.
          </p>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-accent/15 text-brand-accent">
            <DollarSign className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-black">سعر الاشتراك الشهري</h2>
            <p className="text-xs text-muted-foreground">
              الافتراضي 25 دولاراً ويُستخدم في حساب الإيرادات تلقائياً.
            </p>
          </div>
        </div>
        <div className="mt-5 flex max-w-lg flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="sr-only">السعر بالدولار</span>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto]" dir="ltr">
              <Input
                className="min-w-0 rounded-e-none border-e-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                dir="ltr"
                inputMode="decimal"
                min="0"
                onChange={(event) => setPrice(event.target.value)}
                step="0.01"
                type="number"
                value={price}
              />
              <span className="grid min-h-11 min-w-16 shrink-0 place-items-center rounded-e-md border border-input bg-muted/45 px-3 text-sm font-black text-muted-foreground">
                USD
              </span>
            </div>
          </label>
          <Button
            disabled={!Number.isFinite(Number(price)) || Number(price) < 0}
            isLoading={savePrice.isPending}
            loadingText="جارٍ الحفظ"
            onClick={() => savePrice.mutate()}
          >
            <Settings2 className="ms-2 h-4 w-4" /> حفظ السعر
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          مثال: اشتراك شهرين يُسجّل تلقائياً بقيمة ${(Number(price || 0) * 2).toFixed(2)}.
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Card className="min-w-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand-accent" />
            <h2 className="font-black">الفترة الزمنية</h2>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {(
              [
                ['day', 'يومي'],
                ['week', 'أسبوعي'],
                ['month', 'شهري'],
                ['custom', 'فترة مخصصة'],
              ] as const
            ).map(([id, label]) => (
              <button
                className={cn(
                  'min-h-11 rounded-lg border px-3 text-sm font-black transition',
                  preset === id
                    ? 'border-brand-accent bg-brand-accent text-black'
                    : 'border-border hover:border-brand-accent/60',
                )}
                key={id}
                onClick={() => selectPreset(id)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
            <label className="min-w-0 overflow-hidden space-y-2 text-sm font-bold">
              من تاريخ
              <Input
                className="block w-0 min-w-full max-w-full appearance-none overflow-hidden [inline-size:0] [min-inline-size:100%]"
                max={to}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPreset('custom');
                }}
                type="date"
                value={from}
              />
            </label>
            <label className="min-w-0 overflow-hidden space-y-2 text-sm font-bold">
              إلى تاريخ
              <Input
                className="block w-0 min-w-full max-w-full appearance-none overflow-hidden [inline-size:0] [min-inline-size:100%]"
                min={from}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPreset('custom');
                }}
                type="date"
                value={to}
              />
            </label>
          </div>
        </Card>

        <Card>
          <h2 className="font-black">محتوى التقرير</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            اختر الإحصاءات التي يريد العميل ظهورها في ملف PDF.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {metricOptions.map((option) => {
              const selected = metrics.includes(option.id);
              return (
                <button
                  aria-pressed={selected}
                  className={cn(
                    'flex min-h-20 items-center gap-3 rounded-lg border p-3 text-start transition',
                    selected
                      ? 'border-brand-accent bg-brand-accent/[0.08]'
                      : 'border-border hover:border-foreground/25',
                  )}
                  key={option.id}
                  onClick={() => toggleMetric(option.id)}
                  type="button"
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-md border',
                      selected ? 'border-brand-accent bg-brand-accent text-black' : 'border-border',
                    )}
                  >
                    {selected ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <span>
                    <strong className="block text-sm">{option.label}</strong>
                    <small className="text-xs leading-5 text-muted-foreground">
                      {option.description}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <Button
        className="w-full py-4 text-base sm:w-auto sm:min-w-72"
        disabled={!metrics.length || !from || !to || from > to}
        isLoading={generate.isPending}
        loadingText="جارٍ تصميم ملف PDF..."
        onClick={() => generate.mutate()}
      >
        <Download className="ms-2 h-5 w-5" /> إنشاء وتنزيل التقرير PDF
      </Button>
      {lastReport ? <Summary report={lastReport} /> : null}
    </div>
  );
}
