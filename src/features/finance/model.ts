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
  'couple',
  'outing',
  'debt',
] as const;
export const debtSourceIconKeys = ['tiktok', 'shopee', 'seasy', 'momo', 'bank', 'person'] as const;
const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);
const text = (max: number) => z.string().trim().min(1).max(max);
const amount = z.number().int().positive().max(1_000_000_000_000);
const instant = z.iso.datetime();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Ngày không hợp lệ.');
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
  paymentMethod: z.enum(['cash', 'bank']).default('cash'),
  categoryId: id,
  debtId: id.optional(),
  note: z.string().max(500),
  occurredAt: pastInstant,
});
export const budgetEntrySchema = z.object({
  id,
  userId: ownerId,
  cash: z.number().int().min(0).max(1_000_000_000_000),
  bank: z.number().int().min(0).max(1_000_000_000_000),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  recordedAt: instant,
});
export const debtSourceSchema = z.object({
  id,
  userId: ownerId,
  name: text(80),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  icon: z.enum(debtSourceIconKeys),
});
export const debtTypeSchema = z.object({
  id,
  userId: ownerId,
  name: z.enum(['Mượn nợ', 'Cho mượn']),
  direction: z.enum(['payable', 'receivable']),
});
export const defaultDebtTypes: z.infer<typeof debtTypeSchema>[] = [
  { id: 'debt-type-borrow', userId: PERSONAL_USER_ID, name: 'Mượn nợ', direction: 'payable' },
  { id: 'debt-type-lend', userId: PERSONAL_USER_ID, name: 'Cho mượn', direction: 'receivable' },
];
export function inferDebtSourceIcon(name: string): (typeof debtSourceIconKeys)[number] {
  const value = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi');
  if (value.includes('tiktok')) return 'tiktok';
  if (value.includes('seasy')) return 'seasy';
  if (value.includes('shopee')) return 'shopee';
  if (value.includes('momo')) return 'momo';
  if (value.includes('ngan hang') || value.includes('bank')) return 'bank';
  return 'person';
}
export const debtSourceIconColors: Record<(typeof debtSourceIconKeys)[number], string> = {
  tiktok: '#111827', shopee: '#ee4d2d', seasy: '#1d4ed8', momo: '#a50064', bank: '#008a70', person: '#2563eb',
};
export const debtSchema = z
  .object({
    id,
    userId: ownerId,
    title: text(100),
    debtSourceId: id,
    debtTypeId: id,
    paymentMethod: z.enum(['cash', 'bank']).default('cash'),
    amount,
    occurredAt: pastInstant,
    dueDate: dateOnly.nullable(),
    settledAt: pastInstant.nullable(),
    note: z.string().max(500),
  })
  .refine((d) => !d.dueDate || d.dueDate >= dateKey(d.occurredAt), 'Hạn thanh toán phải từ ngày ghi nhận trở đi.')
  .refine((d) => !d.settledAt || d.settledAt >= d.occurredAt, 'Thời gian hoàn tất không hợp lệ.');
export const financeSchema = z
  .object({
    schemaVersion: z.literal(3),
    balance: z.number().int().safe().default(0),
    budget: z.number().int().min(0).max(1_000_000_000_000),
    budgets: z.array(budgetEntrySchema).max(5000).default([]),
    categories: z.array(categorySchema).min(1).max(100),
    expenses: z.array(expenseSchema).max(5000),
    debtSources: z.array(debtSourceSchema).max(2000),
    debtTypes: z.array(debtTypeSchema).min(1).max(20),
    debts: z.array(debtSchema).max(2000),
  })
  .superRefine((data, ctx) => {
    for (const key of ['categories', 'expenses', 'debtSources', 'debtTypes', 'debts', 'budgets'] as const) {
      if (new Set(data[key].map((item) => item.id)).size !== data[key].length)
        ctx.addIssue({ code: 'custom', message: `ID trùng trong ${key}.`, path: [key] });
    }
    const categories = new Set(data.categories.map((c) => c.id));
    const debtSources = new Set(data.debtSources.map((source) => source.id));
    const debtTypes = new Set(data.debtTypes.map((type) => type.id));
    const debtIds = new Set(data.debts.map((debt) => debt.id));
    const linkedExpenses = data.expenses.filter((expense) => expense.debtId);
    if (linkedExpenses.some((expense) => !debtIds.has(expense.debtId!)))
      ctx.addIssue({ code: 'custom', message: 'Chi tiêu tham chiếu công nợ không tồn tại.', path: ['expenses'] });
    if (new Set(linkedExpenses.map((expense) => expense.debtId)).size !== linkedExpenses.length)
      ctx.addIssue({ code: 'custom', message: 'Một công nợ chỉ có một chi tiêu tự động.', path: ['expenses'] });
    if (data.expenses.some((e) => !categories.has(e.categoryId)))
      ctx.addIssue({
        code: 'custom',
        message: 'Chi tiêu tham chiếu danh mục không tồn tại.',
        path: ['expenses'],
      });
    if (data.debts.some((d) => !debtSources.has(d.debtSourceId)))
      ctx.addIssue({
        code: 'custom',
        message: 'Công nợ tham chiếu nguồn không tồn tại.',
        path: ['debts'],
      });
    if (data.debts.some((d) => !debtTypes.has(d.debtTypeId)))
      ctx.addIssue({
        code: 'custom',
        message: 'Công nợ tham chiếu loại công nợ không tồn tại.',
        path: ['debts'],
      });
  });
export type Category = z.infer<typeof categorySchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type BudgetEntry = z.infer<typeof budgetEntrySchema>;
export type DebtSource = z.infer<typeof debtSourceSchema>;
export type DebtType = z.infer<typeof debtTypeSchema>;
export type Debt = z.infer<typeof debtSchema>;
export type FinanceData = z.infer<typeof financeSchema>;
export function debtDirection(data: Pick<FinanceData, 'debtTypes'>, debt: Pick<Debt, 'debtTypeId'>) {
  return data.debtTypes.find((type) => type.id === debt.debtTypeId)?.direction || 'payable';
}
export type Snapshot = { data: FinanceData; revision: number };
export const LEGACY_STORAGE_KEY = 'vi-cua-toi:v1';
export const initialData: FinanceData = {
  schemaVersion: 3,
  balance: 0,
  budget: 0,
  budgets: [],
  categories: [
    { id: 'food', userId: PERSONAL_USER_ID, name: 'Ăn uống', color: '#2563eb', icon: 'utensils' },
    { id: 'shopping', userId: PERSONAL_USER_ID, name: 'Mua sắm', color: '#f59e0b', icon: 'bag' },
    { id: 'transport', userId: PERSONAL_USER_ID, name: 'Di chuyển', color: '#06b6d4', icon: 'car' },
    { id: 'bills', userId: PERSONAL_USER_ID, name: 'Hóa đơn', color: '#8b5cf6', icon: 'receipt' },
    { id: 'other', userId: PERSONAL_USER_ID, name: 'Khác', color: '#10b981', icon: 'receipt' },
  ],
  expenses: [],
  debtSources: [],
  debtTypes: defaultDebtTypes,
  debts: [],
};
export const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
export function dateKey(value: string | Date = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export function dateKeyFromLocal(value: Date) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}
export function budgetMonth(entry: Pick<BudgetEntry, 'recordedAt' | 'month'>) {
  return entry.month || dateKey(entry.recordedAt).slice(0, 7);
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
  if (raw && typeof raw === 'object' && 'schemaVersion' in raw) {
    const source = raw as Record<string, unknown>;
    if (source.schemaVersion !== 2 && source.schemaVersion !== 3) throw new Error('UNSUPPORTED_BACKUP_VERSION');
    const modernSources = source.debtSources as Array<Record<string, unknown>> | undefined;
    const debtSources = (modernSources?.length ? modernSources : source.people ?? modernSources ?? []) as Array<Record<string, unknown>>;
    const debts = (source.debts ?? []) as Array<Record<string, unknown>>;
    const sourceTypes = source.debtTypes as Array<Record<string, unknown>> | undefined;
    const parsed = financeSchema.parse({
      ...source,
      debtSources: debtSources.map((item) => {
        const icon = debtSourceIconKeys.includes(item.icon as (typeof debtSourceIconKeys)[number])
          ? item.icon as (typeof debtSourceIconKeys)[number]
          : inferDebtSourceIcon(String(item.name || ''));
        return { ...item, icon, color: debtSourceIconColors[icon] };
      }),
      debtTypes: sourceTypes?.length ? sourceTypes : defaultDebtTypes,
      debts: debts.map((item) => ({
        ...item,
        debtSourceId: item.debtSourceId ?? item.personId,
        debtTypeId: item.debtTypeId ?? (item.direction === 'receivable' ? 'debt-type-lend' : 'debt-type-borrow'),
        dueDate: item.dueDate ?? (typeof item.dueAt === 'string' ? dateKey(item.dueAt) : null),
      })),
      schemaVersion: 3,
    });
    if (!parsed.budgets.length && parsed.budget > 0) parsed.budgets.push({ id: 'budget-migration', userId: PERSONAL_USER_ID, cash: parsed.budget, bank: 0, recordedAt: new Date().toISOString() });
    return parsed;
  }
  const old = legacySchema.parse(raw);
  return financeSchema.parse({
    ...old,
    schemaVersion: 3,
    debtSources: [],
    debtTypes: defaultDebtTypes,
    debts: [],
    budgets: old.budget > 0 ? [{ id: 'budget-migration', userId: PERSONAL_USER_ID, cash: old.budget, bank: 0, recordedAt: new Date().toISOString() }] : [],
    categories: old.categories.map((c) => ({ ...c, icon: 'receipt' })),
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

/** Reconcile available money from recorded funding, expenses and settled debts. */
export function calculateBalance(data: FinanceData) {
  const recordedDebts = new Set(data.expenses.map((expense) => expense.debtId).filter(Boolean));
  return data.budgets.reduce((sum, entry) => sum + entry.cash + entry.bank, 0)
    - data.expenses.reduce((sum, entry) => sum + entry.amount, 0)
    + data.debts.reduce((sum, debt) => !debt.settledAt ? sum
      : sum + (debtDirection(data, debt) === 'receivable' ? debt.amount : recordedDebts.has(debt.id) ? 0 : -debt.amount), 0);
}

/** Reconcile linked expenses atomically with debt changes; never backfill unrelated old loans. */
export function reconcileDebtExpenses(previous: FinanceData, next: FinanceData): FinanceData {
  const previousDebts = new Map(previous.debts.map((debt) => [debt.id, debt]));
  const previousLinks = new Map(previous.expenses.filter((expense) => expense.debtId).map((expense) => [expense.debtId!, expense]));
  const proposedLinks = new Map(next.expenses.filter((expense) => expense.debtId).map((expense) => [expense.debtId!, expense]));
  const protectedIds = new Set([...previousLinks.values()].map((expense) => expense.id));
  const expenses = next.expenses.filter((expense) => !expense.debtId && !protectedIds.has(expense.id));
  const categories = [...next.categories];
  let category = [...previousLinks.values(), ...proposedLinks.values()]
    .map((expense) => categories.find((item) => item.id === expense.categoryId)).find(Boolean)
    ?? categories.find((item) => item.name.trim().toLocaleLowerCase('vi') === 'công nợ')
    ?? categories.find((item) => item.icon === 'debt');

  for (const debt of next.debts) {
    const old = previousDebts.get(debt.id);
    const linked = previousLinks.get(debt.id) ?? proposedLinks.get(debt.id);
    const direction = debtDirection(next, debt);
    const lending = direction === 'receivable';
    const needsExpense = lending
      ? !!linked || !old || debtDirection(previous, old) !== 'receivable'
      : !!debt.settledAt && (!!linked || !old || !old.settledAt || debtDirection(previous, old) !== 'payable');
    if (!needsExpense) continue;
    if (!category) {
      category = { id: crypto.randomUUID(), userId: PERSONAL_USER_ID, name: 'Công nợ', icon: 'debt', color: '#0d9488' };
      categories.push(category);
    }
    const sameEvent = old && debtDirection(previous, old) === direction;
    const occurredAt = lending ? sameEvent && linked ? linked.occurredAt : debt.occurredAt : debt.settledAt!;
    expenses.push({
      id: linked?.id ?? crypto.randomUUID(),
      userId: PERSONAL_USER_ID,
      debtId: debt.id,
      categoryId: linked && categories.some((item) => item.id === linked.categoryId) ? linked.categoryId : category.id,
      title: debt.title,
      amount: debt.amount,
      note: debt.note,
      paymentMethod: debt.paymentMethod ?? linked?.paymentMethod ?? 'cash',
      occurredAt,
    });
  }
  return financeSchema.parse({ ...next, categories, expenses });
}
export function getCashStatistics(data: FinanceData, month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const income = data.budgets.filter((entry) => budgetMonth(entry) === month)
    .reduce((sum, entry) => sum + entry.cash + entry.bank, 0);
  const reserve = data.debts.filter((debt) => !debt.settledAt
    && debtDirection(data, debt) === 'payable' && debt.dueDate?.startsWith(month))
    .reduce((sum, debt) => sum + debt.amount, 0);
  return { income, averageIncome: income / days, reserve, actual: data.balance - reserve };
}
