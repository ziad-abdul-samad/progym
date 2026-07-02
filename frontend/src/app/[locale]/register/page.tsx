import { Suspense } from 'react';

import { RegisterForm } from '@/features/auth/auth-forms';
import { Skeleton } from '@/components/ui/state';

export default function RegisterPage() {
  return (
    <main className="min-h-screen px-4 py-10">
      <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
