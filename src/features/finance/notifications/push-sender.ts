import 'server-only';
import webpush from 'web-push';
import type { PushDevice } from './push-repository';
import { pushConfig } from './push-config';

export type PushMessage = { title: string; body: string; tag: string };
export async function sendWebPush(device: PushDevice, message: PushMessage, ttl = 3600) {
  const config = pushConfig();
  if (!config) throw new Error('PUSH_NOT_CONFIGURED');
  await webpush.sendNotification({ endpoint: device.endpoint, keys: device.keys }, JSON.stringify(message), {
    vapidDetails: config,
    TTL: Math.max(1, Math.min(86400, ttl)),
    urgency: 'high',
    timeout: 8000,
  });
}

export function expiredPush(error: unknown) {
  return !!error && typeof error === 'object' && 'statusCode' in error
    && (error.statusCode === 404 || error.statusCode === 410);
}
