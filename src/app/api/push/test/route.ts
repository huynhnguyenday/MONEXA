import { guard, json, readJson } from '@/lib/http';
import { getDatabase } from '@/lib/mongodb';
import { pushDeviceSchema } from '@/features/finance/notifications/push-schema';
import { pushDeviceId, type PushDevice } from '@/features/finance/notifications/push-repository';
import { pushAuthEpoch, pushConfig } from '@/features/finance/notifications/push-config';
import { expiredPush, sendWebPush } from '@/features/finance/notifications/push-sender';
import { PERSONAL_USER_ID } from '@/features/finance/model';
import { debtPushMessage } from '@/features/finance/notifications/push-message';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const rejected = await guard(request, true);
  if (rejected) return rejected;
  const config = pushConfig();
  if (!config) return json({ error: 'Thông báo từ máy chủ chưa được cấu hình.' }, 503);
  const body = pushDeviceSchema.safeParse(await readJson(request, 8192).catch(() => null));
  if (!body.success) return json({ error: 'Thiết bị không hợp lệ.' }, 400);
  try {
    const devices = (await getDatabase()).collection<PushDevice>('push_subscriptions');
    // Atomic throttle: an authenticated client cannot repeatedly trigger pushes.
    const device = await devices.findOneAndUpdate({ _id: pushDeviceId(body.data.endpoint), userId: PERSONAL_USER_ID,
      authEpoch: pushAuthEpoch(), publicKey: config.publicKey,
      $or: [{ lastTestAt: { $exists: false } }, { lastTestAt: { $lt: new Date(Date.now() - 60000) } }],
    }, { $set: { lastTestAt: new Date() } }, { returnDocument: 'after' });
    if (!device) return json({ error: 'Hãy đăng ký thiết bị và chờ ít nhất một phút giữa hai lần thử.' }, 429);
    try {
      const debt = await (await getDatabase()).collection<{ _id: string; userId: string; title: string; amount: number; dueDate: string | null }>('debts')
        .findOne({ userId: PERSONAL_USER_ID, settledAt: null, dueDate: { $ne: null } }, { sort: { dueDate: 1, _id: 1 } });
      await sendWebPush(device, debt?.dueDate
        ? debtPushMessage({ ...debt, dueDate: debt.dueDate }, 'monexa:test', true)
        : { title: 'MONEXA · Thông báo thử', body: 'Đã nhận Web Push. Hiện không có khoản công nợ chưa thanh toán có hạn để gửi thử.', tag: 'monexa:test' });
    } catch (error) {
      if (expiredPush(error)) await devices.deleteOne({ _id: device._id, userId: PERSONAL_USER_ID });
      throw error;
    }
    return json({ ok: true });
  } catch { return json({ error: 'Chưa gửi được thông báo thử. Kiểm tra kết nối và đăng ký lại thiết bị.' }, 503); }
}
