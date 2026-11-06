import 'server-only';
import { createHash } from 'node:crypto';
import type { Db } from 'mongodb';
import type { z } from 'zod';
import { getDatabase } from '@/lib/mongodb';
import { PERSONAL_USER_ID } from '../model';
import { pushSubscriptionSchema } from './push-schema';
import { pushAuthEpoch, pushConfig } from './push-config';

export type PushDevice = z.infer<typeof pushSubscriptionSchema> & {
  _id: string; userId: string; authEpoch: string; publicKey: string; createdAt: Date; updatedAt: Date; lastTestAt?: Date;
};
export const pushDeviceId = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex');

export async function createPushIndexes(db: Db) {
  await db.collection('push_subscriptions').createIndex({ userId: 1, authEpoch: 1, publicKey: 1 });
  await db.collection('reminder_jobs').createIndex({ userId: 1, status: 1, scheduledAt: 1 });
  await db.collection('reminder_jobs').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 7 * 86400 });
  await db.collection('push_deliveries').createIndex({ userId: 1, subscriptionId: 1, jobId: 1 });
  await db.collection('push_deliveries').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

export async function savePushDevice(input: unknown) {
  const subscription = pushSubscriptionSchema.parse(input);
  const config = pushConfig();
  if (!config) throw new Error('PUSH_NOT_CONFIGURED');
  const db = await getDatabase();
  if (!await db.collection<{ _id: string }>('users').findOne({ _id: PERSONAL_USER_ID })) throw new Error('OWNER_NOT_INITIALIZED');
  const devices = db.collection<PushDevice>('push_subscriptions');
  const _id = pushDeviceId(subscription.endpoint);
  const now = new Date();
  await devices.deleteMany({ userId: PERSONAL_USER_ID, $or: [
    { authEpoch: { $ne: pushAuthEpoch() } }, { publicKey: { $ne: config.publicKey } },
    { expirationTime: { $gte: 0, $lte: now.getTime() } },
  ] });
  if (subscription.expirationTime != null && subscription.expirationTime <= now.getTime()) throw new Error('SUBSCRIPTION_EXPIRED');
  if (!await devices.findOne({ _id, userId: PERSONAL_USER_ID })
    && await devices.countDocuments({ userId: PERSONAL_USER_ID }) >= 20) throw new Error('TOO_MANY_DEVICES');
  await devices.updateOne({ _id, userId: PERSONAL_USER_ID }, {
    $set: { ...subscription, authEpoch: pushAuthEpoch(), publicKey: config.publicKey, updatedAt: now },
    $setOnInsert: { createdAt: now, userId: PERSONAL_USER_ID },
  }, { upsert: true });
}

export async function removePushDevice(endpoint: string) {
  await (await getDatabase()).collection<PushDevice>('push_subscriptions')
    .deleteOne({ _id: pushDeviceId(endpoint), userId: PERSONAL_USER_ID });
}
