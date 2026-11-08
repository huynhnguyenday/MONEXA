import { guard, json } from '@/lib/http';
import { getDatabase } from '@/lib/mongodb';
import type { PushDevice } from '@/features/finance/notifications/push-repository';
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
  try {
    const db = await getDatabase();
    const devices = db.collection<PushDevice>('push_subscriptions');
    const now = new Date();
    const owner = {
      userId: PERSONAL_USER_ID,
      authEpoch: pushAuthEpoch(),
      publicKey: config.publicKey,
    };
    const active = {
      ...owner,
      $or: [{ expirationTime: null }, { expirationTime: { $gt: now.getTime() } }],
    };
    const candidates = await devices.find(active).limit(20).toArray();
    if (!candidates.length)
      return json(
        {
          error:
            'Chưa có thiết bị đăng ký nhận thông báo hợp lệ. Hãy bật thông báo trên điện thoại trước.',
        },
        404,
      );
    const debt = await db
      .collection<{
        _id: string;
        userId: string;
        title: string;
        amount: number;
        dueDate: string | null;
      }>('debts')
      .findOne(
        { userId: PERSONAL_USER_ID, settledAt: null, dueDate: { $ne: null } },
        { sort: { dueDate: 1, _id: 1 } },
      );
    const message = debt?.dueDate
      ? debtPushMessage({ ...debt, dueDate: debt.dueDate }, 'monexa:test', true)
      : {
          title: 'MONEXA · Thông báo thử',
          body: 'Đã nhận Web Push. Hiện không có khoản công nợ chưa thanh toán có hạn để gửi thử.',
          tag: 'monexa:test',
        };
    let sent = 0,
      failed = 0,
      skipped = 0;
    await Promise.all(
      candidates.map(async (candidate) => {
        // Each device is claimed atomically, including concurrent requests from other devices.
        const device = await devices.findOneAndUpdate(
          {
            ...active,
            _id: candidate._id,
            $and: [
              {
                $or: [
                  { lastTestAt: { $exists: false } },
                  { lastTestAt: { $lt: new Date(now.getTime() - 60000) } },
                ],
              },
            ],
          },
          { $set: { lastTestAt: now } },
          { returnDocument: 'after' },
        );
        if (!device) {
          skipped++;
          return;
        }
        try {
          await sendWebPush(device, message);
          sent++;
        } catch (error) {
          failed++;
          if (expiredPush(error))
            await devices.deleteOne({ _id: device._id, ...owner, lastTestAt: now });
        }
      }),
    );
    const result = { sent, failed, skipped, total: candidates.length };
    if (!sent && !failed)
      return json(
        {
          ...result,
          error: 'Các thiết bị vừa được gửi thử. Hãy chờ ít nhất một phút rồi thử lại.',
        },
        429,
      );
    if (!sent)
      return json(
        {
          ...result,
          error:
            'Chưa gửi được tới thiết bị nào. Kiểm tra kết nối và đăng ký thông báo trên thiết bị nhận.',
        },
        503,
      );
    return json({ ok: true, ...result });
  } catch {
    return json(
      { error: 'Chưa gửi được thông báo thử. Kiểm tra kết nối và đăng ký lại thiết bị.' },
      503,
    );
  }
}
