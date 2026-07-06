'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Camera,
  Dumbbell,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldQuestion,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import type { PublicLocale } from '@progym/shared';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { apiRequest, jsonBody } from '@/lib/api/client';
import type { SessionUser } from '@/lib/auth/use-auth';

type SecurityQuestion = { key: string; textAr: string };
type RegistrationStart = { claimToken: string; requestId: string; status: 'PENDING' };
type RegistrationStatus = {
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  user?: SessionUser;
};

function dashboardPath(user: SessionUser, locale: PublicLocale = 'ar'): string {
  if (user.role === 'ADMIN') return '/ar/dashboard/admin';
  if (user.role === 'COACH') return '/ar/dashboard/coach';
  return `/${locale}/dashboard/member`;
}

export function LegacyLoginForm() {
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

const loginCopy = {
  ar: {
    button: 'دخول إلى حسابي',
    create: 'إنشاء حساب جديد',
    error: 'تعذر تسجيل الدخول',
    forgot: 'نسيت كلمة المرور؟',
    loading: 'جار تسجيل الدخول...',
    noAccount: 'ليس لديك حساب؟',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    proof: 'اتصال آمن ومشفّر',
    title: 'تسجيل الدخول',
    username: 'اسم المستخدم',
    usernamePlaceholder: 'أدخل اسم المستخدم',
  },
  en: {
    button: 'Enter my account',
    create: 'Create an account',
    error: 'Unable to sign in',
    forgot: 'Forgot password?',
    loading: 'Signing in...',
    noAccount: 'New to Pro Gym?',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    proof: 'Secure encrypted connection',
    title: 'Sign in',
    username: 'Username',
    usernamePlaceholder: 'Enter your username',
  },
} as const;

export function LoginForm({ locale = 'ar' }: { locale?: PublicLocale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const copy = loginCopy[locale];

  const login = useMutation({
    mutationFn: () =>
      apiRequest<SessionUser>('/auth/login', {
        body: jsonBody({ password, username }),
        method: 'POST',
      }),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      push({
        title: locale === 'ar' ? 'تم تسجيل الدخول' : 'Signed in successfully',
        tone: 'success',
      });
      const next = searchParams.get('next');
      const safeNext = next?.startsWith(`/${locale}/`) && !next.startsWith('//') ? next : null;
      router.push(user.role === 'MEMBER' && safeNext ? safeNext : dashboardPath(user, locale));
    },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        login.mutate();
      }}
    >
      <h2 className="sr-only">{copy.title}</h2>
      <div>
        <label
          className="mb-2.5 block text-[0.58rem] font-black uppercase tracking-[0.16em] text-white/42"
          htmlFor="login-username"
        >
          {copy.username}
        </label>
        <div className="group relative">
          <UserRound className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25 transition group-focus-within:text-[#39ff14]" />
          <Input
            autoComplete="username"
            className="h-16 rounded-none border-white/12 bg-white/[0.035] ps-12 text-base text-white shadow-none placeholder:text-white/22 hover:border-white/25 focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14]"
            id="login-username"
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder={copy.usernamePlaceholder}
            required
            value={username}
          />
        </div>
      </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between gap-4">
          <label
            className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-white/42"
            htmlFor="login-password"
          >
            {copy.password}
          </label>
          <Link
            className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/30 transition hover:text-[#39ff14]"
            href={`/${locale}/forgot-password`}
          >
            {copy.forgot}
          </Link>
        </div>
        <div className="group relative">
          <LockKeyhole className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25 transition group-focus-within:text-[#39ff14]" />
          <Input
            autoComplete="current-password"
            className="h-16 rounded-none border-white/12 bg-white/[0.035] pe-12 ps-12 text-base text-white shadow-none placeholder:text-white/22 hover:border-white/25 focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14]"
            id="login-password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.passwordPlaceholder}
            required
            type={showPassword ? 'text' : 'password'}
            value={password}
          />
          <button
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute end-4 top-1/2 -translate-y-1/2 text-white/25 transition hover:text-[#39ff14]"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {login.error ? (
        <div className="border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="font-black">{copy.error}</p>
          <p className="mt-1 text-red-200/65">{login.error.message}</p>
        </div>
      ) : null}

      <Button
        className="group h-16 w-full justify-between rounded-none bg-[#39ff14] px-6 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[0_18px_50px_rgba(57,255,20,0.12)] hover:bg-white"
        disabled={login.isPending}
        isLoading={login.isPending}
        loadingText={copy.loading}
        type="submit"
      >
        <span>{copy.button}</span>
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
      </Button>

      <div className="flex items-center gap-4 py-1">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[0.54rem] font-black uppercase tracking-[0.14em] text-white/24">
          {copy.noAccount}
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <Link
        className="group flex h-14 w-full items-center justify-between border border-white/14 bg-white/[0.025] px-5 text-xs font-black uppercase tracking-[0.12em] text-white/65 transition hover:border-[#39ff14] hover:text-[#39ff14]"
        href={`/${locale}/register`}
      >
        <span>{copy.create}</span>
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
      </Link>

      <div className="flex items-center justify-between border-t border-white/10 pt-5 text-[0.55rem] font-black uppercase tracking-[0.14em] text-white/25">
        <span>{copy.proof}</span>
        <span>SSL / 256</span>
      </div>
    </form>
  );
}

const registerCopy = {
  ar: {
    answer: 'الإجابة',
    create: 'إنشاء حسابي',
    creating: 'جار إنشاء الحساب...',
    dateOfBirth: 'تاريخ الميلاد',
    female: 'أنثى',
    fitnessGoal: 'هدفك الرياضي',
    fullName: 'الاسم الكامل',
    gender: 'الجنس',
    height: 'الطول بالسنتيمتر',
    identity: 'الهوية والحساب',
    male: 'ذكر',
    metrics: 'البيانات الرياضية',
    noFile: 'لم يتم اختيار صورة',
    other: 'آخر',
    password: 'كلمة المرور',
    passwordConfirmation: 'تأكيد كلمة المرور',
    phone: 'رقم الهاتف',
    photo: 'صورة الملف الشخصي',
    security: 'حماية الحساب',
    securityHint: 'استخدم إجابات تتذكرها ولا يعرفها الآخرون.',
    subtitle: 'أكمل الحقول بدقة لبناء ملف عضوية قابل للمتابعة.',
    title: 'ملف عضوية جديد',
    username: 'اسم المستخدم',
    weight: 'الوزن بالكيلوغرام',
  },
  en: {
    answer: 'Answer',
    create: 'Create my account',
    creating: 'Creating account...',
    dateOfBirth: 'Date of birth',
    female: 'Female',
    fitnessGoal: 'Your fitness goal',
    fullName: 'Full name',
    gender: 'Gender',
    height: 'Height in centimeters',
    identity: 'Identity and account',
    male: 'Male',
    metrics: 'Training profile',
    noFile: 'No photograph selected',
    other: 'Other',
    password: 'Password',
    passwordConfirmation: 'Confirm password',
    phone: 'Phone number',
    photo: 'Profile photograph',
    security: 'Account protection',
    securityHint: 'Use answers you will remember and other people will not know.',
    subtitle: 'Complete each field accurately to build a trackable membership profile.',
    title: 'New membership profile',
    username: 'Username',
    weight: 'Weight in kilograms',
  },
} as const;

const registerInputClass =
  'h-14 rounded-none border-white/12 bg-white/[0.035] text-sm text-white shadow-none placeholder:text-white/24 hover:border-white/25 focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14]';

function RegisterSectionHeader({
  icon: Icon,
  number,
  title,
}: {
  icon: typeof UserRound;
  number: string;
  title: string;
}) {
  return (
    <div className="mb-7 flex items-center justify-between border-b border-white/10 pb-5">
      <div className="flex items-center gap-4">
        <span className="text-[0.56rem] font-black text-[#39ff14]">{number}</span>
        <h2 className="text-lg font-black uppercase tracking-[0.06em] text-white">{title}</h2>
      </div>
      <Icon className="h-5 w-5 text-white/25" />
    </div>
  );
}

export function ImmersiveRegisterForm({ locale = 'ar' }: { locale?: PublicLocale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [photo, setPhoto] = useState<File | null>(null);
  const [claimToken, setClaimToken] = useState(() => searchParams.get('claim'));
  const copy = registerCopy[locale];

  const { data: questions = [] } = useQuery({
    queryFn: () => apiRequest<SecurityQuestion[]>('/auth/security-questions'),
    queryKey: ['security-questions'],
  });
  const selectedQuestions = useMemo(() => questions.slice(0, 3), [questions]);
  const approval = useQuery({
    enabled: Boolean(claimToken),
    queryFn: () =>
      apiRequest<RegistrationStatus>('/auth/registration-status', {
        body: jsonBody({ claimToken }),
        method: 'POST',
      }),
    queryKey: ['registration-status', claimToken],
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? 1_000 : false),
    retry: true,
  });

  useEffect(() => {
    if (approval.data?.status !== 'APPROVED' || !approval.data.user) return;
    void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    router.replace(dashboardPath(approval.data.user, locale));
  }, [approval.data, locale, queryClient, router]);

  const register = useMutation({
    mutationFn: (formData: FormData) =>
      apiRequest<RegistrationStart>('/auth/register', {
        body: formData,
        method: 'POST',
      }),
    onSuccess: (result) => {
      push({
        body:
          locale === 'ar'
            ? 'سيظهر حسابك مباشرة بعد اعتماد المراقب'
            : 'Your account will open after staff approval',
        title: locale === 'ar' ? 'تم إرسال طلبك' : 'Request submitted',
        tone: 'success',
      });
      setClaimToken(result.claimToken);
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

  if (claimToken) {
    const rejected = approval.data?.status === 'REJECTED';
    return (
      <div className="border border-white/10 bg-[#080a08]/95 p-7 text-center md:p-12">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${rejected ? 'border-red-400/40 text-red-300' : 'border-[#39ff14]/40 text-[#39ff14]'}`}
        >
          <ShieldQuestion className="h-7 w-7" />
        </div>
        <p className="mt-6 text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#39ff14]">
          Pro Gym / Registration
        </p>
        <h2 className="mt-4 font-ar-display text-3xl font-black leading-[1.45] text-white">
          {rejected
            ? locale === 'ar'
              ? 'تعذّر اعتماد الطلب'
              : 'Request not approved'
            : locale === 'ar'
              ? 'طلبك بانتظار اعتماد المراقب'
              : 'Waiting for staff approval'}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/50">
          {rejected
            ? approval.data?.reason ||
              (locale === 'ar'
                ? 'راجع موظف الاستقبال لمعرفة السبب.'
                : 'Please ask reception for details.')
            : locale === 'ar'
              ? 'ابقَ في هذه الصفحة. سيتم تسجيل دخولك تلقائياً بعد مراجعة بياناتك وصورتك وتحديد مدة الاشتراك.'
              : 'Keep this page open. You will be signed in automatically after your details, photo, and membership duration are approved.'}
        </p>
        {!rejected ? (
          <span className="mx-auto mt-7 block h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#39ff14]" />
        ) : null}
      </div>
    );
  }

  return (
    <form className="border border-white/10 bg-[#080a08]/90 p-5 md:p-8 lg:p-10" onSubmit={submit}>
      <div className="mb-10">
        <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#39ff14]">
          Pro Gym / Onboarding
        </p>
        <h2
          className={`mt-4 font-black text-white ${
            locale === 'ar'
              ? 'font-ar-display text-3xl leading-[1.2] md:text-5xl'
              : 'text-3xl uppercase leading-[0.98] tracking-[-0.045em] md:text-5xl'
          }`}
        >
          {copy.title}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/38">{copy.subtitle}</p>
      </div>

      <section>
        <RegisterSectionHeader icon={UserRound} number="01" title={copy.identity} />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            className={registerInputClass}
            name="fullName"
            placeholder={copy.fullName}
            required
          />
          <Input
            className={registerInputClass}
            name="username"
            placeholder={copy.username}
            required
          />
          <Input
            className={registerInputClass}
            name="password"
            placeholder={copy.password}
            required
            type="password"
          />
          <Input
            className={registerInputClass}
            name="passwordConfirmation"
            placeholder={copy.passwordConfirmation}
            required
            type="password"
          />
          <Input className={registerInputClass} name="phone" placeholder={copy.phone} required />
          <div className="relative min-w-0 overflow-hidden">
            <label
              className="pointer-events-none absolute start-4 top-2 z-10 text-[0.48rem] font-black uppercase tracking-[0.12em] text-white/30"
              htmlFor="register-birth-date"
            >
              {copy.dateOfBirth}
            </label>
            <Input
              aria-label={copy.dateOfBirth}
              className={`${registerInputClass} min-w-0 max-w-full appearance-none pt-5 [color-scheme:dark]`}
              id="register-birth-date"
              name="dateOfBirth"
              required
              type="date"
            />
          </div>
          <div className="relative md:col-span-2">
            <label
              className="pointer-events-none absolute start-4 top-2 z-10 text-[0.48rem] font-black uppercase tracking-[0.12em] text-white/30"
              htmlFor="register-gender"
            >
              {copy.gender}
            </label>
            <select
              className={`${registerInputClass} w-full appearance-none px-4 pt-5 outline-none`}
              id="register-gender"
              name="gender"
              required
            >
              <option className="bg-[#080a08]" value="MALE">
                {copy.male}
              </option>
              <option className="bg-[#080a08]" value="FEMALE">
                {copy.female}
              </option>
              <option className="bg-[#080a08]" value="OTHER">
                {copy.other}
              </option>
            </select>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <RegisterSectionHeader icon={Dumbbell} number="02" title={copy.metrics} />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            className={registerInputClass}
            min="1"
            name="heightCm"
            placeholder={copy.height}
            required
            type="number"
          />
          <Input
            className={registerInputClass}
            min="1"
            name="weightKg"
            placeholder={copy.weight}
            required
            type="number"
          />
          <Input
            className={`${registerInputClass} md:col-span-2`}
            name="fitnessGoal"
            placeholder={copy.fitnessGoal}
            required
          />
          <label className="group flex min-h-28 cursor-pointer items-center gap-5 border border-dashed border-white/16 bg-white/[0.025] p-5 transition hover:border-[#39ff14]/60 md:col-span-2">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/12 text-[#39ff14]">
              <Camera className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-black text-white">{copy.photo}</span>
              <span className="mt-1 block text-xs text-white/30">JPG / PNG / WEBP</span>
            </span>
            <span className="ms-auto max-w-44 truncate text-xs text-white/35">
              {photo?.name ?? copy.noFile}
            </span>
            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              name="photo"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              required
              type="file"
            />
          </label>
        </div>
      </section>

      <section className="mt-12">
        <RegisterSectionHeader icon={ShieldQuestion} number="03" title={copy.security} />
        <p className="mb-5 text-xs leading-6 text-white/35">{copy.securityHint}</p>
        <div className="grid gap-4">
          {selectedQuestions.map((question, index) => (
            <div className="border border-white/10 bg-white/[0.02] p-4" key={question.key}>
              <input name={`question${index + 1}Key`} type="hidden" value={question.key} />
              <label className="text-xs font-bold leading-6 text-white/52">
                <span className="me-2 text-[#39ff14]">0{index + 1}</span>
                {question.textAr}
              </label>
              <Input
                className={`${registerInputClass} mt-3`}
                name={`question${index + 1}Answer`}
                placeholder={copy.answer}
                required
              />
            </div>
          ))}
        </div>
      </section>

      {register.error ? (
        <div className="mt-6 border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          {register.error.message}
        </div>
      ) : null}

      <Button
        className="group mt-8 h-16 w-full justify-between rounded-none bg-[#39ff14] px-6 text-xs font-black uppercase tracking-[0.14em] text-black hover:bg-white"
        disabled={register.isPending}
        isLoading={register.isPending}
        loadingText={copy.creating}
        type="submit"
      >
        <span>{copy.create}</span>
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
      </Button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const [photo, setPhoto] = useState<File | null>(null);

  const { data: questions = [] } = useQuery({
    queryFn: () => apiRequest<SecurityQuestion[]>('/auth/security-questions'),
    queryKey: ['security-questions'],
  });
  const selectedQuestions = useMemo(() => questions.slice(0, 3), [questions]);

  const register = useMutation({
    mutationFn: (formData: FormData) =>
      apiRequest<RegistrationStart>('/auth/register', {
        body: formData,
        method: 'POST',
      }),
    onSuccess: (result) => {
      push({ title: 'تم إنشاء الحساب', body: 'أهلا بك في Pro Gym', tone: 'success' });
      router.push(`/ar/register?claim=${encodeURIComponent(result.claimToken)}`);
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
