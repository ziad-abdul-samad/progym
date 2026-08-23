import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

const branchCodes = new Set(['b1', 'b2', 'b3']);

export function generateStaticParams() {
  return [{ branchCode: 'b1' }, { branchCode: 'b2' }, { branchCode: 'b3' }];
}

export default async function BranchDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ branchCode: string }>;
}) {
  const { branchCode } = await params;
  if (!branchCodes.has(branchCode)) notFound();
  return children;
}
