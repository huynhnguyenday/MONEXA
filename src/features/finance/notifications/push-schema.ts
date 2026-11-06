import { z } from 'zod';

export function trustedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash
      && (!url.port || url.port === '443') && (
        host === 'fcm.googleapis.com' || host === 'web.push.apple.com'
        || host === 'updates.push.services.mozilla.com'
        || host.endsWith('.notify.windows.com')
      );
  } catch { return false; }
}
export const pushEndpointSchema = z.string().max(4096).refine(trustedPushEndpoint, 'Địa chỉ Web Push không được hỗ trợ.');
const key = (length: number) => z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/).refine(value => {
  // Validate decoded lengths without exposing subscription keys in errors.
  const raw = Buffer.from(value, 'base64url');
  return raw.length === length && (length !== 65 || raw[0] === 4);
}, 'Khóa Web Push không hợp lệ.');
export const pushSubscriptionSchema = z.object({
  endpoint: pushEndpointSchema,
  expirationTime: z.number().int().nonnegative().nullable().optional(),
  keys: z.object({ p256dh: key(65), auth: key(16) }).strict(),
}).strict();
export const pushDeviceSchema = z.object({ endpoint: pushEndpointSchema }).strict();
