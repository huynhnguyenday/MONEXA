import { z } from 'zod';
import { guard, json, readJson } from '@/lib/http';
import { pushConfig } from '@/features/finance/notifications/push-config';
import { pushDeviceSchema } from '@/features/finance/notifications/push-schema';
import { removePushDevice, savePushDevice } from '@/features/finance/notifications/push-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const rejected = await guard(request);
  if (rejected) return rejected;
  const config = pushConfig();
  return json({ enabled: !!config, publicKey: config?.publicKey || null });
}
export async function POST(request: Request) {
  const rejected = await guard(request, true);
  if (rejected) return rejected;
  if (!pushConfig()) return json({ error: 'Thông báo từ máy chủ chưa được cấu hình.' }, 503);
  try {
    await savePushDevice(await readJson(request, 8192));
    return json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: 'Đăng ký Web Push không hợp lệ.' }, 400);
    return json({ error: 'Chưa đăng ký được thông báo trên thiết bị này. Hãy thử lại.' }, 503);
  }
}
export async function DELETE(request: Request) {
  const rejected = await guard(request, true);
  if (rejected) return rejected;
  try {
    const body = pushDeviceSchema.parse(await readJson(request, 8192));
    await removePushDevice(body.endpoint);
    return json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: 'Thiết bị không hợp lệ.' }, 400);
    return json({ error: 'Chưa gỡ được đăng ký thông báo. Hãy thử lại.' }, 503);
  }
}
