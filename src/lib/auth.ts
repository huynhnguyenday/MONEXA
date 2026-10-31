import 'server-only';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDatabase } from './mongodb';
export const SESSION_COOKIE = 'monexa_session';
export const SESSION_AGE = 60 * 60 * 24 * 7;
export function missingConfig() {
  return ['MONGODB_URI', 'APP_PASSWORD', 'SESSION_SECRET'].filter(
    (key) =>
      !process.env[key] ||
      (key === 'APP_PASSWORD' && process.env[key]!.length < 12) ||
      (key === 'SESSION_SECRET' && process.env[key]!.length < 32),
  );
}
export function matchesPassword(input: string) {
  return timingSafeEqual(
    createHash('sha256').update(input).digest(),
    createHash('sha256')
      .update(process.env.APP_PASSWORD || '')
      .digest(),
  );
}
function signature(value: string) {
  return createHmac('sha256', process.env.SESSION_SECRET!)
    .update(`${value}:${process.env.APP_PASSWORD}`)
    .digest('hex');
}
export function createSession() {
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_AGE);
  return `${expires}.${signature(expires)}`;
}
export async function isAuthenticated() {
  if (missingConfig().length) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const [expires, hash, extra] = token.split('.');
  if (
    extra ||
    !/^\d+$/.test(expires) ||
    !/^[a-f0-9]{64}$/.test(hash || '') ||
    Number(expires) <= Date.now() / 1000
  )
    return false;
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(signature(expires), 'hex'));
}
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export async function consumeLoginAttempt(request: Request) {
  const attempts = (await getDatabase()).collection<{
    _id: string;
    count: number;
    expiresAt: Date;
  }>('login_attempts');
  await attempts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const ip =
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    'local';
  const window = Math.floor(Date.now() / (15 * 60 * 1000));
  const key = createHmac('sha256', process.env.SESSION_SECRET!).update(ip).digest('hex');
  const attempt = await attempts.findOneAndUpdate(
    { _id: `${key}:${window}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 16 * 60 * 1000) } },
    { upsert: true, returnDocument: 'after' },
  );
  return !!attempt && attempt.count <= 10;
}
