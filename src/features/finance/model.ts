import { z } from 'zod';

// One reserved owner for this personal application. No registration or multi-user UI.
export const PERSONAL_USER_ID = 'personal';
const ownerId = z.literal(PERSONAL_USER_ID).default(PERSONAL_USER_ID);

export const iconKeys = [
  'utensils',
  'bag',
  'car',
  'receipt',
  'heart',
  'home',
  'coffee',
  'plane',
  'book',
  'gift',
  'game',
  'wallet',
] as const;
const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);
const text = (max: number) => z.string().trim().min(1).max(max);
const amount = z.number().int().positive().max(1_000_000_000_000);
const instant = z.iso.datetime();
const pastInstant = instant.refine(
  (value) => Date.parse(value) <= Date.now() + 60_000,
  'Thời gian không được ở tương lai.',
);
export const categorySchema = z.object({
  id,
  userId: ownerId,
  name: text(50),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  icon: z.enum(iconKeys),
});
export const expenseSchema = z.object({
  id,
  userId: ownerId,
  title: text(100),
  amount,
  categoryId: id,
  note: z.string().max(500),
  occurredAt: pastInstant,
});
export const personSchema = z.object({ id, userId: ownerId, name: text(80) });
export const debtSchema = z
  .object({
    id,
    userId: ownerId,
    title: text(100),
    personId: id,
    direction: z.enum(['receivable', 'payable']),
    amount,
    occurredAt: pastInstant,
    dueAt: instant.nullable(),
    settledAt: pastInstant.nullable(),
    note: z.string().max(500),
  })
  .refine((d) => !d.dueAt || d.dueAt >= d.occurredAt, 'Hạn thanh toán phải sau thời gian ghi nhận.')
  .refine((d) => !d.settledAt || d.settledAt >= d.occurredAt, 'Thời gian hoàn tất không hợp lệ.');
export const financeSchema = z
  .object({
    schemaVersion: z.literal(2),
    budget: z.number().int().min(0).max(1_000_000_000_000),
    categories: z.array(categorySchema).min(1).max(100),
    expenses: z.array(expenseSchema).max(5000),
    people: z.array(personSchema).max(2000),
    debts: z.array(debtSchema).max(2000),
  })
  .superRefine((data, ctx) => {
    for (const key of ['categories', 'expenses', 'people', 'debts'] as const) {
      if (new Set(data[key].map((item) => item.id)).size !== data[key].length)
        ctx.addIssue({ code: 'custom', message: `ID trùng trong ${key}.`, path: [key] });
    }
    const categories = new Set(data.categories.map((c) => c.id));
    const people = new Set(data.people.map((p) => p.id));
    if (data.expenses.some((e) => !categories.has(e.categoryId)))
      ctx.addIssue({
        code: 'custom',
        message: 'Chi tiêu tham chiếu danh mục không tồn tại.',
        path: ['expenses'],
      });
    if (data.debts.some((d) => !people.has(d.personId)))
      ctx.addIssue({
        code: 'custom',
        message: 'Công nợ tham chiếu người không tồn tại.',
        path: ['debts'],
      });
  });
export type Category = z.infer<typeof categorySchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type Person = z.infer<typeof personSchema>;
export type Debt = z.infer<typeof debtSchema>;
export type FinanceData = z.infer<typeof financeSchema>;
export type Snapshot = { data: FinanceData; revision: number };
export const LEGACY_STORAGE_KEY = 'vi-cua-toi:v1';
export const initialData: FinanceData = {
  schemaVersion: 2,
  budget: 0,
  categories: [
    { id: 'food', userId: PERSONAL_USER_ID, name: 'Ăn uống', color: '#2563eb', icon: 'utensils' },
    { id: 'shopping', userId: PERSONAL_USER_ID, name: 'Mua sắm', color: '#f59e0b', icon: 'bag' },
    { id: 'transport', userId: PERSONAL_USER_ID, name: 'Di chuyển', color: '#06b6d4', icon: 'car' },
    { id: 'bills', userId: PERSONAL_USER_ID, name: 'Hóa đơn', color: '#8b5cf6', icon: 'receipt' },
    { id: 'other', userId: PERSONAL_USER_ID, name: 'Khác', color: '#10b981', icon: 'wallet' },
  ],
  expenses: [],
  people: [],
  debts: [],
};
export const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
export function dateKey(value: string | Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export const localDate = () => dateKey();
export const displayTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
const legacyDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Ngày trong bản sao lưu không hợp lệ.');
const legacySchema = z.object({
  budget: z.number(),
  categories: z.array(z.object({ id, name: z.string(), color: z.string() })),
  expenses: z.array(
    z.object({ id, amount: z.number(), categoryId: id, note: z.string(), date: legacyDate }),
  ),
});
export function parseBackup(raw: unknown): FinanceData {
  if (raw && typeof raw === 'object' && 'schemaVersion' in raw) return financeSchema.parse(raw);
  const old = legacySchema.parse(raw);
  return financeSchema.parse({
    ...old,
    schemaVersion: 2,
    people: [],
    debts: [],
    categories: old.categories.map((c) => ({ ...c, icon: 'wallet' })),
    expenses: old.expenses.map((e) => ({
      id: e.id,
      amount: e.amount,
      categoryId: e.categoryId,
      title: e.note || old.categories.find((c) => c.id === e.categoryId)?.name || 'Chi tiêu',
      note: e.note,
      occurredAt: new Date(`${e.date}T00:00:00+07:00`).toISOString(),
    })),
  });
}
export function getStatistics(data: FinanceData, month: string, today = localDate()) {
  const expenses = data.expenses.filter((e) => dateKey(e.occurredAt).startsWith(month));
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const [year, m] = month.split('-').map(Number);
  const days =
    month === today.slice(0, 7)
      ? Number(today.slice(8))
      : month > today.slice(0, 7)
        ? 0
        : new Date(Date.UTC(year, m, 0)).getUTCDate();
  const counts: number[] = Array(7).fill(0),
    sums: number[] = Array(7).fill(0);
  for (let day = 1; day <= days; day++)
    counts[(new Date(Date.UTC(year, m - 1, day)).getUTCDay() + 6) % 7]++;
  expenses.forEach((e) => {
    sums[(new Date(`${dateKey(e.occurredAt)}T12:00:00Z`).getUTCDay() + 6) % 7] += e.amount;
  });
  return {
    expenses: [...expenses].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    total,
    average: days ? total / days : 0,
    weekday: sums.map((s, i) => (counts[i] ? s / counts[i] : 0)),
    categories: data.categories.map((c) =>
      expenses.filter((e) => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0),
    ),
  };
}
