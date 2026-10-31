import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  consumeLoginAttempt,
  createSession,
  matchesPassword,
  missingConfig,
  sameOrigin,
  SESSION_AGE,
  SESSION_COOKIE,
} from '@/lib/auth';
import { json, readJson } from '@/lib/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
  if (missingConfig().length)
    return json({ error: 'Cần hoàn tất cấu hình MONEXA trên máy chủ.' }, 503);
  try {
    const body = z
      .object({ password: z.string().min(1).max(200) })
      .safeParse(await readJson(request, 2048));
    if (!body.success) return json({ error: 'Mật khẩu không hợp lệ.' }, 400);
    if (!(await consumeLoginAttempt(request)))
      return json({ error: 'Đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.' }, 429);
    if (!matchesPassword(body.data.password)) return json({ error: 'Mật khẩu chưa đúng.' }, 401);
    (await cookies()).set(SESSION_COOKIE, createSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_AGE,
    });
    return json({ ok: true });
  } catch {
    return json(
      { error: 'Không thể đăng nhập. Vui lòng kiểm tra kết nối MongoDB hoặc thử lại sau.' },
      503,
    );
  }
}
