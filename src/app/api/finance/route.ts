import { z } from 'zod';
import { financeSchema } from '@/features/finance/model';
import { readFinance, writeFinance } from '@/features/finance/repository';
import { guard, json, readJson } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const rejected = await guard(request);
  if (rejected) return rejected;
  try {
    return json(await readFinance());
  } catch {
    return json(
      {
        error:
          'Không tải được dữ liệu MongoDB. Kiểm tra cấu hình và quyền kết nối, sau đó thử lại.',
      },
      503,
    );
  }
}
export async function PUT(request: Request) {
  const rejected = await guard(request, true);
  if (rejected) return rejected;
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return json({ error: 'Dữ liệu không hợp lệ hoặc vượt giới hạn 2 MB.' }, 400);
  }
  const parsed = z
    .object({ data: financeSchema, revision: z.number().int().min(0) })
    .safeParse(body);
  if (!parsed.success)
    return json({ error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, 400);
  try {
    const snapshot = await writeFinance(parsed.data.data, parsed.data.revision);
    if (!snapshot)
      return json(
        {
          error:
            'Dữ liệu đã thay đổi trên thiết bị khác. Tải lại dữ liệu rồi thực hiện lại để tránh ghi đè.',
        },
        409,
      );
    return json(snapshot);
  } catch {
    return json({ error: 'Chưa lưu được lên MongoDB. Hãy giữ trang mở và thử lại.' }, 503);
  }
}
