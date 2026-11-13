import { redirect } from 'next/navigation';
import { isAuthenticated, missingConfig } from '@/lib/auth';
import LoginForm from '@/features/auth/login-form';
export const dynamic = 'force-dynamic';
export default async function LoginPage() {
  if (await isAuthenticated()) redirect('/overview');
  return <LoginForm missing={missingConfig()} />;
}
