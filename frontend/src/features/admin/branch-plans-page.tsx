'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Pencil, CalendarDays, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogForm, DialogCancelButton } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DashboardLoader, ErrorState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { apiRequest, jsonBody } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/use-auth';
import { money, PlanAudienceField, useBranchPlans, type BranchPlan } from './plan-picker';

export function BranchPlansPage() {
  const params = useParams();
  return <BranchPlansContent key={String(params.branchCode)} />;
}
function BranchPlansContent() {
  const auth = useAuth();
  const observerAudience =
    auth.data?.role === 'OBSERVER' ? auth.data.shiftObserver?.audience : undefined;
  const plans = useBranchPlans(),
    client = useQueryClient();
  const [editing, setEditing] = useState<BranchPlan | 'new' | null>(null);
  const [deleting, setDeleting] = useState<BranchPlan | null>(null);
  const { push } = useToast();
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest('/memberships/plans/' + id, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      client.setQueriesData<BranchPlan[]>({ queryKey: ['branch-plans'] }, (old) =>
        old?.filter((p) => p.id !== id),
      );
      setDeleting(null);
      push({ title: 'تم حذف الباقة مع الحفاظ على الاشتراكات والسجلات السابقة', tone: 'success' });
      void client.invalidateQueries({ queryKey: ['branch-plans'] });
    },
  });
  const save = useMutation({
    mutationFn: (form: FormData) =>
      apiRequest('/memberships/plans' + (editing && editing !== 'new' ? '/' + editing.id : ''), {
        method: editing === 'new' ? 'POST' : 'PATCH',
        body: jsonBody({
          nameAr: String(form.get('name')).trim(),
          nameEn: String(form.get('name')).trim(),
          durationDays: Number(form.get('days')),
          priceMinor: Math.round(Number(form.get('price')) * 100),
          currency: form.get('currency'),
          audience: observerAudience ?? form.get('audience'),
          isActive: form.get('active') === 'on',
        }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['branch-plans'] });
      setEditing(null);
    },
  });
  const current = editing && editing !== 'new' ? editing : null;
  return (
    <div className="min-w-0 space-y-5" dir="rtl">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-green-700 dark:text-brand-accent">
            PRO GYM / الباقات
          </p>
          <h1 className="mt-2 text-2xl font-black">باقات الاشتراك</h1>
          {observerAudience ? (
            <p className="mt-2 text-sm font-bold text-green-700 dark:text-brand-accent">
              {observerAudience === 'WOMEN' ? 'قسم السيدات' : 'قسم الرجال'}
            </p>
          ) : null}
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            أسعار ومدد خاصة بهذا الفرع. تعديل الباقة يؤثر على الدفعات الجديدة فقط؛ السجلات القديمة
            تبقى محفوظة. يمكنك إيقاف الباقة مؤقتاً أو حذفها من القائمة دون التأثير على المشتركين
            الحاليين.
          </p>
        </div>
        <Button
          onClick={() => {
            save.reset();
            setEditing('new');
          }}
        >
          <Plus className="h-4 w-4" /> باقة أو عرض جديد
        </Button>
      </Card>
      {plans.isLoading ? (
        <DashboardLoader />
      ) : plans.error ? (
        <ErrorState message={plans.error.message} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.data?.map((plan) => (
            <Card
              key={plan.id}
              className={!plan.isActive ? 'opacity-65' : 'border-brand-accent/25'}
            >
              <div className="flex items-start justify-between gap-3">
                <CalendarDays className="h-6 w-6 text-green-700 dark:text-brand-accent" />
                <span className="rounded-full bg-muted px-3 py-1 text-xs">
                  {plan.isActive ? 'متاحة للاشتراك' : 'متوقفة'}
                </span>
              </div>
              <h2 className="mt-5 text-lg font-black">{plan.nameAr}</h2>
              <p className="mt-2 text-xs font-bold text-muted-foreground">
                {plan.audience === 'WOMEN' ? 'السيدات' : 'الرجال'}
              </p>
              <p className="mt-3 text-2xl font-black" dir="ltr">
                {money(plan.priceMinor, plan.currency)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.durationDays} يوم من تاريخ التفعيل
              </p>
              <Button
                className="mt-5 w-full"
                variant="secondary"
                onClick={() => {
                  save.reset();
                  setEditing(plan);
                }}
              >
                <Pencil className="h-4 w-4" /> تعديل الباقة
              </Button>
              <Button
                className="mt-2 w-full"
                variant="danger"
                onClick={() => {
                  remove.reset();
                  setDeleting(plan);
                }}
              >
                <Trash2 className="h-4 w-4" /> حذف الباقة
              </Button>
            </Card>
          ))}
        </div>
      )}
      <Dialog
        open={!!editing}
        onClose={() => {
          if (!save.isPending) setEditing(null);
        }}
        title={current ? 'تعديل الباقة' : 'إضافة باقة أو عرض'}
      >
        {editing ? (
          <DialogForm
            key={current?.id ?? 'new'}
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(new FormData(e.currentTarget));
            }}
            actions={
              <>
                <DialogCancelButton
                  onClick={() => {
                    if (!save.isPending) setEditing(null);
                  }}
                />
                <Button isLoading={save.isPending}>حفظ الباقة</Button>
              </>
            }
          >
            <label className="grid gap-2 text-sm">
              اسم الباقة
              <Input name="name" maxLength={120} required defaultValue={current?.nameAr} />
            </label>
            {observerAudience ? (
              <p className="text-sm font-bold">
                هذه الباقة مخصصة لقسم {observerAudience === 'WOMEN' ? 'السيدات' : 'الرجال'}.
              </p>
            ) : (
              <PlanAudienceField defaultValue={current?.audience ?? 'MEN'} />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm">
                المدة بالأيام
                <Input
                  name="days"
                  type="number"
                  min={1}
                  max={2000}
                  required
                  defaultValue={current?.durationDays ?? 30}
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm">
                السعر
                <Input
                  dir="ltr"
                  name="price"
                  type="number"
                  min={0}
                  max={20000000}
                  step="0.01"
                  required
                  defaultValue={(current?.priceMinor ?? 0) / 100}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm">
              العملة
              <select
                name="currency"
                className="min-h-12 w-full rounded-lg border border-input bg-card px-3"
                defaultValue={current?.currency ?? 'SYP_NEW'}
              >
                <option value="SYP_NEW">ليرة سورية جديدة</option>
                <option value="USD">دولار أمريكي</option>
              </select>
            </label>
            <label className="flex gap-3 text-sm">
              <input name="active" type="checkbox" defaultChecked={current?.isActive ?? true} />{' '}
              إتاحة الباقة للاشتراكات الجديدة
            </label>
            <p className="text-xs leading-6 text-muted-foreground">
              لن يتم تعديل أي دفعة سابقة. يتم توثيق التعديل باسم حسابك في سجل المالك.
            </p>
            {save.error ? <ErrorState message={save.error.message} /> : null}
          </DialogForm>
        ) : null}
      </Dialog>
      <Dialog
        open={!!deleting}
        title="حذف باقة الاشتراك؟"
        onClose={() => {
          if (!remove.isPending) setDeleting(null);
        }}
      >
        {deleting ? (
          <DialogForm
            onSubmit={(e) => {
              e.preventDefault();
              remove.mutate(deleting.id);
            }}
            actions={
              <>
                <DialogCancelButton
                  onClick={() => {
                    if (!remove.isPending) setDeleting(null);
                  }}
                />
                <Button variant="danger" isLoading={remove.isPending} loadingText="جاري الحذف">
                  تأكيد حذف الباقة
                </Button>
              </>
            }
          >
            <p className="text-lg font-bold">{deleting.nameAr}</p>
            <p className="text-sm leading-7 text-muted-foreground">
              ستختفي الباقة من القائمة ولن يمكن اختيارها لاشتراك جديد. اشتراكات اللاعبين الحالية
              والدفعات والتقارير السابقة لن تتغيّر. سيتم توثيق الحذف باسم حسابك.
            </p>
            {remove.error ? <ErrorState message={remove.error.message} /> : null}
          </DialogForm>
        ) : null}
      </Dialog>
    </div>
  );
}
