import Dashboard from '@/features/finance/dashboard';
import { isAuthenticated } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect('/login');
  // A shared layout preserves finance state and its background revision check
  // while App Router navigates between business pages.
  return <><Dashboard />{children}</>;
}
