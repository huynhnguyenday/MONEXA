import { cookies } from 'next/headers';
import { SESSION_COOKIE, sameOrigin } from '@/lib/auth';
import { json } from '@/lib/http';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
  (await cookies()).delete(SESSION_COOKIE);
  return json({ ok: true });
}
