import { guard, json, readJson } from '@/lib/http';
import { getDatabase } from '@/lib/mongodb';
import {
  notificationCursor,
  notificationMutationSchema,
} from '@/features/finance/notifications/notification-schema';
import {
  readNotifications,
  mutateNotifications,
} from '@/features/finance/notifications/notification-repository';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const rejected = await guard(request);
  if (rejected) return rejected;
  const raw = new URL(request.url).searchParams.get('cursor');
  const cursor = notificationCursor.optional().safeParse(raw ?? undefined);
  if (!cursor.success) return json({ error: 'Trang thông báo không hợp lệ.' }, 400);
  try {
    return json(await readNotifications(await getDatabase(), cursor.data));
  } catch {
    return json({ error: 'Chưa tải được lịch sử thông báo. Hãy thử lại.' }, 503);
  }
}
export async function PATCH(request: Request) {
  const rejected = await guard(request, true);
  if (rejected) return rejected;
  let raw: unknown;
  try {
    raw = await readJson(request, 16000);
  } catch {
    return json({ error: 'Yêu cầu cập nhật thông báo không hợp lệ.' }, 400);
  }
  const parsed = notificationMutationSchema.safeParse(raw);
  if (!parsed.success) return json({ error: 'Yêu cầu cập nhật thông báo không hợp lệ.' }, 400);
  try {
    return json(await mutateNotifications(await getDatabase(), parsed.data));
  } catch {
    return json({ error: 'Chưa cập nhật được thông báo. Hãy thử lại.' }, 503);
  }
}
