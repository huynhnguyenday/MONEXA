import { z } from 'zod';

const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);
const owner = z.literal('personal').default('personal');
const amount = z.number().int().positive().max(1_000_000_000_000);
const instant = z.iso
  .datetime()
  .refine((v) => Date.parse(v) <= Date.now() + 60_000, 'Ngày giao dịch không được ở tương lai.');
export const fundIds = ['unallocated', 'savings', 'spending'] as const;
export const incomeTypes = {
  salary: 'Lương',
  freelance: 'Công việc ngoài',
  gift: 'Được cho',
  other: 'Khác',
  opening: 'Số dư mở đầu',
} as const;
export const fundLabels = {
  unallocated: 'Chưa phân bổ',
  savings: 'Tiết kiệm',
  spending: 'Ngân sách chi tiêu',
} as const;
export const defaultFunds = fundIds.map((id) => ({
  id,
  userId: 'personal' as const,
  name: fundLabels[id],
}));
const common = {
  id,
  userId: owner,
  amount,
  paymentMethod: z.enum(['cash', 'bank']),
  occurredAt: instant,
  note: z.string().trim().max(500),
};
export const fundSchema = z.object({
  id: z.enum(fundIds),
  userId: owner,
  name: z.string().min(1).max(80),
});
export const incomeSchema = z.object({
  ...common,
  fundId: z.literal('unallocated'),
  type: z.enum(['salary', 'freelance', 'gift', 'other', 'opening']),
  title: z.string().trim().min(1).max(100),
});
export const transferSchema = z
  .object({
    ...common,
    fromFundId: z.enum(['unallocated', 'savings', 'spending']),
    toFundId: z.enum(['savings', 'spending']),
  })
  .refine((v) => v.fromFundId !== v.toFundId, 'Sổ nguồn và đích phải khác nhau.');
export const supportSchema = z.object({
  ...common,
  sourceFundId: z.enum(['unallocated', 'spending']),
});
export const incomeFields = {
  funds: z.array(fundSchema).length(3).default(defaultFunds),
  incomes: z.array(incomeSchema).max(5000).default([]),
  fundTransfers: z.array(transferSchema).max(5000).default([]),
  familySupports: z.array(supportSchema).max(5000).default([]),
};
export type Income = z.infer<typeof incomeSchema>;
export type FundTransfer = z.infer<typeof transferSchema>;
export type FamilySupport = z.infer<typeof supportSchema>;
export type IncomeData = {
  funds: z.infer<typeof fundSchema>[];
  incomes: Income[];
  fundTransfers: FundTransfer[];
  familySupports: FamilySupport[];
  budgets: {
    id: string;
    userId: 'personal';
    transferId?: string;
    cash: number;
    bank: number;
    month?: string;
    recordedAt: string;
  }[];
};
export type IncomeRecord =
  | { kind: 'income'; entry: Income }
  | { kind: 'transfer'; entry: FundTransfer }
  | { kind: 'support'; entry: FamilySupport };
export type Accounts = { cash: number; bank: number; total: number };
export function incomeRecords(data: IncomeData): IncomeRecord[] {
  return [
    ...data.incomes.map((entry): IncomeRecord => ({ kind: 'income', entry })),
    ...data.fundTransfers.map((entry): IncomeRecord => ({ kind: 'transfer', entry })),
    ...data.familySupports.map((entry): IncomeRecord => ({ kind: 'support', entry })),
  ];
}
/** Replays actual cash movements, never budgets twice. Rejects spending unfunded sources. */
export function calculateFunds(data: IncomeData) {
  const balances: Record<'unallocated' | 'savings', Accounts> = {
    unallocated: { cash: 0, bank: 0, total: 0 },
    savings: { cash: 0, bank: 0, total: 0 },
  };
  const priority = (r: IncomeRecord) =>
    r.kind === 'income' ? 0 : r.kind === 'transfer' && r.entry.toFundId === 'savings' ? 1 : 2;
  const records = incomeRecords(data).sort(
    (a, b) => Date.parse(a.entry.occurredAt) - Date.parse(b.entry.occurredAt) || priority(a) - priority(b),
  );
  for (const r of records) {
    const e = r.entry;
    if (r.kind === 'income') balances.unallocated[e.paymentMethod] += e.amount;
    else {
      const source = r.kind === 'support' ? r.entry.sourceFundId : r.entry.fromFundId;
      if (source !== 'spending') {
        if (balances[source][e.paymentMethod] < e.amount) throw new Error('INSUFFICIENT_FUND');
        balances[source][e.paymentMethod] -= e.amount;
      }
      if (r.kind === 'transfer' && r.entry.toFundId === 'savings')
        balances.savings[e.paymentMethod] += e.amount;
    }
    for (const balance of Object.values(balances)) {
      balance.total = balance.cash + balance.bank;
      if (!Object.values(balance).every(Number.isSafeInteger))
        throw new Error('INVALID_FUND_BALANCE');
    }
  }
  return balances;
}

export function validateIncomeLinks(data: IncomeData): string | undefined {
  for (const key of ['funds', 'incomes', 'fundTransfers', 'familySupports'] as const)
    if (new Set(data[key].map((v) => v.id)).size !== data[key].length)
      return `ID trùng trong ${key}.`;
  if (fundIds.some((id) => !data.funds.some((fund) => fund.id === id)))
    return 'Thiếu sổ tiền bắt buộc.';
  const budgets = data.budgets.filter((b) => b.transferId);
  if (new Set(budgets.map((b) => b.transferId)).size !== budgets.length)
    return 'Một chuyển tiền chỉ được cấp ngân sách một lần.';
  for (const transfer of data.fundTransfers) {
    const linked = budgets.filter((b) => b.transferId === transfer.id);
    if (transfer.toFundId !== 'spending') {
      if (linked.length) return 'Chuyển tiết kiệm không được liên kết ngân sách.';
      continue;
    }
    const b = linked[0];
    if (
      !b ||
      b.recordedAt !== transfer.occurredAt ||
      b.cash !== (transfer.paymentMethod === 'cash' ? transfer.amount : 0) ||
      b.bank !== (transfer.paymentMethod === 'bank' ? transfer.amount : 0)
    )
      return 'Phiếu cấp ngân sách không khớp chuyển tiền nguồn.';
  }
  if (
    budgets.some(
      (b) => !data.fundTransfers.some((t) => t.id === b.transferId && t.toFundId === 'spending'),
    )
  )
    return 'Ngân sách tham chiếu chuyển tiền không tồn tại.';
  try {
    calculateFunds(data);
  } catch {
    return 'Số dư nguồn không đủ tại ngày giao dịch. Kiểm tra tiền mặt/chuyển khoản và lịch sử phân bổ.';
  }
}
