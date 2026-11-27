import { z } from 'zod';

export const notificationId = z.string().regex(/^[a-f0-9]{64}$/);
export const notificationSchema = z.object({
  id: notificationId,
  tag: z.string().min(1).max(180),
  title: z.string().min(1).max(120),
  body: z.string().max(16000),
  receivedAt: z.iso.datetime(),
  read: z.boolean(),
});
export type InAppNotification = z.infer<typeof notificationSchema>;
export const notificationPageSchema = z.object({
  items: z.array(notificationSchema).max(50),
  nextCursor: z.string().nullable(),
  unreadCount: z.number().int().nonnegative(),
  asOf: z.iso.datetime(),
});
export const notificationMutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read'), ids: z.array(notificationId).min(1).max(50) }).strict(),
  z
    .object({
      action: z.literal('read-all'),
      through: z.iso.datetime().refine((value) => Date.parse(value) <= Date.now() + 1000),
    })
    .strict(),
  z.object({ action: z.literal('delete'), id: notificationId }).strict(),
]);
export const notificationCursor = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\|[a-f0-9]{64}$/)
  .refine((value) => Number.isFinite(Date.parse(value.split('|')[0])));
