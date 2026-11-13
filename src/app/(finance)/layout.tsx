import Dashboard from '@/features/finance/dashboard';
import { isAuthenticated, passwordLoginEnabled } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect('/login');
  // A shared layout preserves the finance snapshot updated by successful writes
  // while App Router navigates between business pages.
  return (
    <>
      <Dashboard passwordLoginEnabled={passwordLoginEnabled()} />
      {children}
    </>
  );
}
