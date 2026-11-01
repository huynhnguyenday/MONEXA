import Dashboard from '@/features/finance/dashboard';
import { isAuthenticated } from '@/lib/auth';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function OverviewPage() {
  if (!(await isAuthenticated())) redirect('/login');
  return <Dashboard />;
}
