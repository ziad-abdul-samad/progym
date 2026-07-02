'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { apiRequest, jsonBody } from '@/lib/api/client';
import type { SessionUser } from '@/lib/auth/use-auth';

type SecurityQuestion = { key: string; textAr: string };

function dashboardPath(user: SessionUser): string {
  if (user.role === 'ADMIN') return '/ar/dashboard/admin';
  if (user.role === 'COACH') return '/ar/dashboard/coach';
  return '/ar/dashboard/member';
}

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () =>
      apiRequest<SessionUser>('/auth/login', {
        body: jsonBody({ password, username }),
        method: 'POST',
      }),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      push({ title: 'تم تسجيل الدخول', tone: 'success' });
      router.push(dashboardPath(user));
    },
  });

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardTitle>تسجيل الدخول</CardTitle>
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          login.mutate();
        }}
      >
        <Input
          autoComplete="username"
          onChange={(event) => setUsername(event.target.value)}
          placeholder="اسم المستخدم"
        />
        <Input
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="كلمة المرور"
          type="password"
        />
        {login.error ? <ErrorState message={login.error.message} /> : null}
        <Button className="w-full" disabled={login.isPending}>
          {login.isPending ? 'جار تسجيل الدخول...' : 'دخول'}
        </Button>
        <button
          className="w-full text-sm text-muted-foreground hover:text-foreground"
          type="button"
          onClick={() => router.push('/ar/forgot-password')}
        >
          نسيت كلمة المرور؟
        </button>
      </form>
    </Card>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [photo, setPhoto] = useState<File | null>(null);

  const { data: questions = [] } = useQuery({
    queryFn: () => apiRequest<SecurityQuestion[]>('/auth/security-questions'),
    queryKey: ['security-questions'],
  });
  const selectedQuestions = useMemo(() => questions.slice(0, 3), [questions]);

  const register = useMutation({
    mutationFn: (formData: FormData) =>
      apiRequest<SessionUser>('/auth/register', {
        body: formData,
        method: 'POST',
      }),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      push({ title: 'تم إنشاء الحساب', body: 'أهلا بك في Pro Gym', tone: 'success' });
      router.push(dashboardPath(user));
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const token = searchParams.get('token');
    if (token) form.set('registrationToken', token);
    if (photo) form.set('photo', photo);
    register.mutate(form);
  }

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardTitle>تسجيل عضو جديد</CardTitle>
      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={submit}>
        <Input name="fullName" placeholder="الاسم الكامل" required />
        <Input name="username" placeholder="اسم المستخدم" required />
        <Input name="password" placeholder="كلمة المرور" required type="password" />
        <Input
          name="passwordConfirmation"
          placeholder="تأكيد كلمة المرور"
          required
          type="password"
        />
        <Input name="phone" placeholder="رقم الهاتف" required />
        <Input name="dateOfBirth" aria-label="تاريخ الميلاد" required type="date" />
        <select
          className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
          name="gender"
          required
        >
          <option value="MALE">ذكر</option>
          <option value="FEMALE">أنثى</option>
          <option value="OTHER">آخر</option>
        </select>
        <Input name="heightCm" placeholder="الطول سم" required type="number" />
        <Input name="weightKg" placeholder="الوزن كغ" required type="number" />
        <Input className="md:col-span-2" name="fitnessGoal" placeholder="الهدف الرياضي" required />
        <Input
          accept="image/jpeg,image/png,image/webp"
          className="md:col-span-2"
          onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
          required
          type="file"
        />
        {selectedQuestions.map((question, index) => (
          <div className="space-y-2" key={question.key}>
            <input name={`question${index + 1}Key`} type="hidden" value={question.key} />
            <label className="text-sm text-muted-foreground">{question.textAr}</label>
            <Input name={`question${index + 1}Answer`} placeholder="الإجابة" required />
          </div>
        ))}
        {register.error ? (
          <div className="md:col-span-2">
            <ErrorState message={register.error.message} />
          </div>
        ) : null}
        <Button className="md:col-span-2" disabled={register.isPending}>
          {register.isPending ? 'جار إنشاء الحساب...' : 'إنشاء الحساب'}
        </Button>
      </form>
    </Card>
  );
}

export function ForgotPasswordForm() {
  const { push } = useToast();
  const { data: questions = [] } = useQuery({
    queryFn: () => apiRequest<SecurityQuestion[]>('/auth/security-questions'),
    queryKey: ['security-questions'],
  });
  const selectedQuestions = questions.slice(0, 3);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const verify = useMutation({
    mutationFn: (payload: Record<string, string>) =>
      apiRequest<{ resetToken: string }>('/auth/forgot-password/verify', {
        body: jsonBody(payload),
        method: 'POST',
      }),
    onSuccess: (data) => setResetToken(data.resetToken),
  });
  const reset = useMutation({
    mutationFn: (newPassword: string) =>
      apiRequest<{ success: boolean }>('/auth/forgot-password/reset', {
        body: jsonBody({ newPassword, resetToken }),
        method: 'POST',
      }),
    onSuccess: () => push({ title: 'تم تغيير كلمة المرور', tone: 'success' }),
  });

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardTitle>استعادة كلمة المرور</CardTitle>
      {!resetToken ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            verify.mutate(Object.fromEntries(form.entries()) as Record<string, string>);
          }}
        >
          <Input name="username" placeholder="اسم المستخدم" required />
          {selectedQuestions.map((question, index) => (
            <div className="space-y-2" key={question.key}>
              <input name={`question${index + 1}Key`} type="hidden" value={question.key} />
              <label className="text-sm text-muted-foreground">{question.textAr}</label>
              <Input name={`question${index + 1}Answer`} placeholder="الإجابة" required />
            </div>
          ))}
          {verify.error ? <ErrorState message={verify.error.message} /> : null}
          <Button disabled={verify.isPending}>
            {verify.isPending ? 'جار التحقق...' : 'تحقق من الإجابات'}
          </Button>
        </form>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            reset.mutate(String(form.get('newPassword')));
          }}
        >
          <Input name="newPassword" placeholder="كلمة المرور الجديدة" required type="password" />
          {reset.error ? <ErrorState message={reset.error.message} /> : null}
          <Button disabled={reset.isPending}>
            {reset.isPending ? 'جار التغيير...' : 'تغيير كلمة المرور'}
          </Button>
        </form>
      )}
    </Card>
  );
}
