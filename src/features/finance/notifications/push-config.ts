import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

export function pushConfig() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT;
  if (!publicKey || !privateKey || !subject || !/^(https:\/\/|mailto:)/.test(subject)) return null;
  if (Buffer.from(publicKey, 'base64url').length !== 65 || Buffer.from(privateKey, 'base64url').length !== 32) return null;
  return { publicKey, privateKey, subject };
}
export function pushAuthEpoch() {
  if (!process.env.APP_PASSWORD || !process.env.SESSION_SECRET) throw new Error('AUTH_NOT_CONFIGURED');
  return createHash('sha256').update(`${process.env.APP_PASSWORD}\0${process.env.SESSION_SECRET}`).digest('hex');
}
export function authorizedCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
