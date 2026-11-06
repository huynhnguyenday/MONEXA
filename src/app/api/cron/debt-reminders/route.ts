import { json } from '@/lib/http';
import { authorizedCron, pushConfig } from '@/features/finance/notifications/push-config';
import { dispatchPushReminders } from '@/features/finance/notifications/push-dispatch';
import { readFinance } from '@/features/finance/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!authorizedCron(request)) return json({ error: 'Không được phép.' }, 401);
  if (!pushConfig()) return json({ error: 'Thông báo chưa được cấu hình.' }, 503);
  try {
    await readFinance(); // Migrate schedules for existing debts and verify the ledger first.
    const result = await dispatchPushReminders();
    return json(result, result.failed ? 503 : 200);
  } catch { return json({ error: 'Chưa xử lý được lịch nhắc. Không thay đổi dữ liệu tiền.' }, 503); }
}
