'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpFromLine, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogCancelButton, DialogForm } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/state';
import { apiRequest, jsonBody } from '@/lib/api/client';
import { businessDate, financialTime } from './finance-format';
import { money, RequestKey } from './plan-picker';

export type OwnerWithdrawal = {
  id: string;
  ownerNameSnapshot: string;
  usdMinor: number;
  sypNewMinor: number;
  withdrawnAt: string;
  notes: string | null;
  createdByName: string;
  createdAt: string;
  voidedAt: string | null;
  voidReason: string | null;
};
export function WithdrawalCards({
  withdrawals,
  onVoid,
}: {
  withdrawals: OwnerWithdrawal[];
  onVoid?: (record: OwnerWithdrawal) => void;
}) {
  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-2">
      {withdrawals.map((record) => (
        <Card
          key={record.id}
          className={record.voidedAt ? 'border-amber-500/30' : 'border-purple-500/20'}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">استلم المالك</p>
              <h3 className="mt-2 break-words font-black">{record.ownerNameSnapshot}</h3>
            </div>
            <ArrowUpFromLine className="h-5 w-5 shrink-0 text-purple-700 dark:text-purple-300" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {record.usdMinor > 0 && (
              <strong dir="ltr" className="rounded-lg bg-muted px-3 py-2">
                {money(record.usdMinor, 'USD')}
              </strong>
            )}
            {record.sypNewMinor > 0 && (
              <strong dir="ltr" className="rounded-lg bg-muted px-3 py-2">
                {money(record.sypNewMinor, 'SYP_NEW')}
              </strong>
            )}
          </div>
          <p className="mt-3 text-sm">
            تاريخ التسليم: {businessDate(new Date(record.withdrawnAt))}
          </p>
          {record.notes && (
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
              {record.notes}
            </p>
          )}
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            سجّله {record.createdByName} · {financialTime(record.createdAt)}
          </p>
          {record.voidedAt ? (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
              ملغى، غير محتسب: {record.voidReason}
            </p>
          ) : (
            onVoid && (
              <Button className="mt-4" variant="secondary" onClick={() => onVoid(record)}>
                إلغاء قيد خاطئ
              </Button>
            )
          )}
        </Card>
      ))}
    </div>
  );
}

export function OwnerWithdrawalsTab({ withdrawals }: { withdrawals: OwnerWithdrawal[] }) {
  const client = useQueryClient();
  const { push } = useToast();
  const [adding, setAdding] = useState(false),
    [voiding, setVoiding] = useState<OwnerWithdrawal | null>(null);
  const [amounts, setAmounts] = useState({ usd: '', syp: '' });
  const refresh = (message: string) => {
    setAdding(false);
    setVoiding(null);
    push({ title: message, tone: 'success' });
    void client.invalidateQueries({ queryKey: ['finance-expenses'] });
  };
  const add = useMutation({
    mutationFn: (form: FormData) =>
      apiRequest('/finance/owner-withdrawals', {
        method: 'POST',
        body: jsonBody({
          ownerName: form.get('ownerName'),
          usdMinor: Math.round(Number(amounts.usd) * 100),
          sypNewMinor: Math.round(Number(amounts.syp) * 100),
          withdrawnOn: form.get('withdrawnOn'),
          notes: form.get('notes'),
          requestKey: form.get('requestKey'),
        }),
      }),
    onSuccess: () => refresh('تم تسجيل المبالغ المسلّمة للمالك بنجاح'),
  });
  const cancel = useMutation({
    mutationFn: (reason: string) =>
      apiRequest('/finance/owner-withdrawals/' + voiding?.id + '/void', {
        method: 'PATCH',
        body: jsonBody({ reason }),
      }),
    onSuccess: () => refresh('تم إلغاء القيد مع حفظه في السجل'),
  });
  return (
    <div className="min-w-0 space-y-4">
      <Card className="border-purple-500/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-black">سحوبات المالك</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              سجّل الأموال التي سُلّمت فعلًا للمالك، وليس المبلغ الذي طلبه فقط. السحوبات تقلّل صافي
              النقد، لكنها ليست مصاريف تشغيلية أو رواتب.
            </p>
          </div>
          <Button
            onClick={() => {
              add.reset();
              setAmounts({ usd: '', syp: '' });
              setAdding(true);
            }}
          >
            <Plus className="h-4 w-4" /> تسجيل تسليم للمالك
          </Button>
        </div>
      </Card>
      {withdrawals.length ? (
        <WithdrawalCards
          withdrawals={withdrawals}
          onVoid={(record) => {
            cancel.reset();
            setVoiding(record);
          }}
        />
      ) : (
        <EmptyState title="لا توجد سحوبات للمالك في هذه الفترة" />
      )}
      <Dialog
        open={adding}
        onClose={() => {
          if (!add.isPending) setAdding(false);
        }}
        title="تسجيل أموال استلمها المالك"
        description="يمكن تسجيل الدولار والليرة معًا في عملية تسليم واحدة. لا تُحوّل العملات ولا تُجمع مع بعضها."
      >
        {adding && (
          <DialogForm
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate(new FormData(e.currentTarget));
            }}
            actions={
              <>
                <DialogCancelButton disabled={add.isPending} onClick={() => setAdding(false)} />
                <Button
                  isLoading={add.isPending}
                  disabled={!(Number(amounts.usd) > 0 || Number(amounts.syp) > 0)}
                >
                  تأكيد التسليم وحفظه
                </Button>
              </>
            }
          >
            <RequestKey />
            <label className="grid min-w-0 gap-2 text-sm font-bold">
              اسم المالك المستلم
              <Input
                name="ownerName"
                required
                minLength={2}
                maxLength={120}
                defaultValue="مالك النادي"
              />
            </label>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {(['usd', 'syp'] as const).map((currency) => (
                <label key={currency} className="grid min-w-0 gap-2 text-sm font-bold">
                  {currency === 'usd'
                    ? 'المبلغ بالدولار الأمريكي'
                    : 'المبلغ بالليرة السورية الجديدة'}
                  <Input
                    dir="ltr"
                    type="number"
                    min="0"
                    max="20000000"
                    step="0.01"
                    placeholder="0.00"
                    value={amounts[currency]}
                    onChange={(e) =>
                      setAmounts((previous) => ({ ...previous, [currency]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <label className="grid min-w-0 gap-2 text-sm font-bold">
              تاريخ تسليم الأموال
              <Input
                name="withdrawnOn"
                type="date"
                className="min-w-0 max-w-full"
                style={{ width: '100%', minWidth: 0 }}
                required
                max={businessDate()}
                defaultValue={businessDate()}
              />
            </label>
            <label className="grid min-w-0 gap-2 text-sm">
              ملاحظات اختيارية
              <Textarea
                name="notes"
                maxLength={2000}
                placeholder="مثال: استلم المالك الأموال من صندوق الفرع"
              />
            </label>
            <div className="rounded-xl border border-purple-500/30 bg-purple-50 p-4 text-sm leading-7 text-purple-950 dark:bg-purple-950 dark:text-purple-100">
              <p className="font-bold">أؤكد أن المالك استلم:</p>
              <p>{money(Math.round(Number(amounts.usd) * 100), 'USD')}</p>
              <p>{money(Math.round(Number(amounts.syp) * 100), 'SYP_NEW')}</p>
              <p className="mt-2 text-xs">
                سيظهر اسمك ووقت التسجيل في التقرير وسجل التدقيق. لا يُسجّل السحب كمصروف مرة ثانية.
              </p>
            </div>
            {add.error && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                {add.error.message}
              </p>
            )}
          </DialogForm>
        )}
      </Dialog>
      <Dialog
        open={!!voiding}
        onClose={() => {
          if (!cancel.isPending) setVoiding(null);
        }}
        title="إلغاء قيد سحب خاطئ"
        description="الإلغاء لتصحيح خطأ في التسجيل، وليس لإثبات إعادة أموال. يبقى القيد والسبب محفوظين ولا يُحتسب المبلغ في الصافي."
      >
        <DialogForm
          onSubmit={(e) => {
            e.preventDefault();
            cancel.mutate(String(new FormData(e.currentTarget).get('reason')));
          }}
          actions={
            <>
              <DialogCancelButton disabled={cancel.isPending} onClick={() => setVoiding(null)} />
              <Button variant="danger" isLoading={cancel.isPending}>
                تأكيد إلغاء القيد
              </Button>
            </>
          }
        >
          <label className="grid gap-2 text-sm">
            سبب التصحيح
            <Textarea name="reason" required minLength={3} maxLength={1000} />
          </label>
          {cancel.error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {cancel.error.message}
            </p>
          )}
        </DialogForm>
      </Dialog>
    </div>
  );
}
