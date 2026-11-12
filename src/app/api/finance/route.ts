import { z } from 'zod';
import { financeSchema } from '@/features/finance/model';
import { readFinance, readFinanceRevision, writeFinance } from '@/features/finance/repository';
import { guard, json, readJson } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const rejected = await guard(request);
  if (rejected) return rejected;
  try {
    const validator = request.headers.get('if-none-match');
    if (validator) {
      const revision = await readFinanceRevision();
      if (revision !== null && validator === `"finance-${revision}"`) {
        return new Response(null, {
          status: 304,
          headers: { 'Cache-Control': 'no-store', ETag: validator },
        });
      }
    }
    const snapshot = await readFinance();
    const response = json(snapshot);
    response.headers.set('ETag', `"finance-${snapshot.revision}"`);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'BALANCE_MISMATCH')
      return json(
        {
          error:
            'Số dư tổng, tiền mặt hoặc chuyển khoản không khớp giao dịch. Cần đối soát dữ liệu trước khi tiếp tục.',
        },
        503,
      );
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
    .object({
      data: financeSchema,
      revision: z.number().int().min(0),
      replace: z.boolean().default(false),
    })
    .safeParse(body);
  if (!parsed.success)
    return json({ error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, 400);
  // An older cached client must not silently erase the new ledgers through defaults.
  const rawData = (body as { data: Record<string, unknown> }).data;
  if (
    !parsed.data.replace &&
    ['funds', 'incomes', 'fundTransfers', 'familySupports', 'budgetExchanges'].some(
      (key) => !Object.hasOwn(rawData, key),
    )
  )
    return json(
      {
        error:
          'Phiên bản ứng dụng chưa hỗ trợ đầy đủ sổ thu nhập. Giữ lại nội dung đang nhập và tải lại ứng dụng trước khi lưu.',
      },
      400,
    );
  try {
    const snapshot = await writeFinance(
      parsed.data.data,
      parsed.data.revision,
      parsed.data.replace,
    );
    if (!snapshot)
      return json(
        {
          error:
            'Dữ liệu đã thay đổi trên thiết bị khác. Tải lại dữ liệu rồi thực hiện lại để tránh ghi đè.',
        },
        409,
      );
    return json(snapshot);
  } catch (error) {
    if (
      error instanceof Error &&
      [
        'INSUFFICIENT_LENDING',
        'INSUFFICIENT_EXCHANGE',
        'EXCHANGE_HISTORY_CHANGED',
        'MISSING_EXCHANGES',
      ].includes(error.message)
    )
      return json(
        {
          error:
            error.message === 'INSUFFICIENT_LENDING'
              ? 'Không đủ số dư nguồn tiền đã chọn để cho mượn.'
              : 'Không đủ số dư để chuyển đổi hoặc lịch sử chuyển đổi đã bị thay đổi. Giữ nội dung và tải lại dữ liệu.',
        },
        400,
      );
    if (error instanceof Error && error.message === 'UNLINKED_BUDGET')
      return json(
        {
          error:
            'Cấp ngân sách mới phải chuyển từ thu nhập hoặc tiết kiệm trong Thu nhập & phân bổ.',
        },
        400,
      );
    if (error instanceof Error && error.message === 'SPENT_BUDGET')
      return json(
        {
          error:
            'Khoản ngân sách đã được sử dụng. Không thể thu hồi khi nguồn ngân sách không đủ tiền.',
        },
        400,
      );
    if (error instanceof z.ZodError)
      return json(
        { error: error.issues[0]?.message || 'Dữ liệu chi tiêu liên kết không hợp lệ.' },
        400,
      );
    if (error instanceof Error && error.message === 'BALANCE_MISMATCH')
      return json(
        {
          error:
            'Số dư không khớp giao dịch gốc. Chưa lưu thay đổi; cần đối soát dữ liệu trước khi tiếp tục.',
        },
        503,
      );
    return json({ error: 'Chưa lưu được lên MongoDB. Hãy giữ trang mở và thử lại.' }, 503);
  }
}
