import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/state';
import { AttendanceScan } from '@/features/attendance/attendance-scan';

export default function AttendancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense fallback={<Skeleton className="mx-auto h-80 max-w-xl" />}>
        <AttendanceScan />
      </Suspense>
    </main>
  );
}
