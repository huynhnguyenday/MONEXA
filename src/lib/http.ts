import { NextResponse } from 'next/server';
import { isAuthenticated, sameOrigin } from './auth';
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function guard(request: Request, mutation = false) {
  if (!(await isAuthenticated())) return json({ error: 'Phiên đăng nhập đã hết hạn.' }, 401);
  if (mutation && !sameOrigin(request)) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
  return null;
}
export async function readJson(request: Request, maxBytes = 2_000_000): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new Error('INVALID_JSON');
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new Error('TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_JSON');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error('TOO_LARGE');
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
