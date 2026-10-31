const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve('src/features/finance/model.ts');
const modelModule = new Module(filename, module);
modelModule.filename = filename;
modelModule.paths = Module._nodeModulePaths(path.dirname(filename));
modelModule._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText,
  filename,
);
const { financeSchema, initialData, parseBackup, getStatistics, dateKey } = modelModule.exports;
const copy = () => structuredClone(initialData);
const expense = {
  id: 'expense-1',
  title: 'Lunch',
  categoryId: 'food',
  amount: 60000,
  occurredAt: '2026-10-05T05:00:00.000Z',
  note: '',
};

test('default data is valid; invalid money is rejected', () => {
  assert.equal(financeSchema.safeParse(copy()).success, true);
  assert.equal(financeSchema.safeParse({ ...copy(), budget: -1 }).success, false);
  assert.equal(
    financeSchema.safeParse({ ...copy(), expenses: [{ ...expense, amount: 1.5 }] }).success,
    false,
  );
  assert.equal(
    financeSchema.safeParse({ ...copy(), expenses: [{ ...expense, amount: 0 }] }).success,
    false,
  );
});
test('reserved personal userId is added to old data; foreign ownership is rejected', () => {
  const parsed = financeSchema.parse({ ...copy(), expenses: [expense] });
  assert.equal(parsed.expenses[0].userId, 'personal');
  assert.equal(parsed.categories[0].userId, 'personal');
  assert.equal(
    financeSchema.safeParse({ ...copy(), expenses: [{ ...expense, userId: 'another-user' }] })
      .success,
    false,
  );
});
test('all links use IDs, and renaming does not change totals', () => {
  const data = { ...copy(), expenses: [expense] };
  const before = getStatistics(data, '2026-10', '2026-10-31');
  data.categories[0].name = 'New name';
  data.categories[0].icon = 'heart';
  assert.equal(financeSchema.safeParse(data).success, true);
  assert.equal(getStatistics(data, '2026-10', '2026-10-31').total, before.total);
});
test('orphan references and duplicate IDs are rejected', () => {
  assert.equal(
    financeSchema.safeParse({ ...copy(), expenses: [{ ...expense, categoryId: 'missing' }] })
      .success,
    false,
  );
  assert.equal(financeSchema.safeParse({ ...copy(), expenses: [expense, expense] }).success, false);
  const data = copy();
  data.categories.push(data.categories[0]);
  assert.equal(financeSchema.safeParse(data).success, false);
});
test('expense title is required independently from optional note', () => {
  assert.equal(financeSchema.safeParse({ ...copy(), expenses: [expense] }).success, true);
  assert.equal(
    financeSchema.safeParse({ ...copy(), expenses: [{ ...expense, title: ' ' }] }).success,
    false,
  );
  assert.equal(
    financeSchema.safeParse({
      ...copy(),
      expenses: [{ ...expense, occurredAt: '2099-01-01T00:00:00.000Z' }],
    }).success,
    false,
  );
});
test('month boundary follows Vietnam time, regardless of server timezone', () => {
  assert.equal(dateKey('2026-09-30T18:00:00.000Z'), '2026-10-01');
  const data = { ...copy(), expenses: [{ ...expense, occurredAt: '2026-09-30T18:00:00.000Z' }] };
  assert.equal(getStatistics(data, '2026-10', '2026-10-31').total, 60000);
  assert.equal(getStatistics(data, '2026-09', '2026-10-31').total, 0);
});
test('daily and weekday averages use elapsed days, including zero-spend days', () => {
  const data = { ...copy(), expenses: [expense] };
  const stats = getStatistics(data, '2026-10', '2026-10-12');
  assert.equal(stats.total, 60000);
  assert.equal(stats.average, 5000);
  assert.equal(stats.weekday[0], 30000); // Monday Oct 5 and Oct 12.
  assert.equal(stats.weekday[1], 0);
  assert.equal(getStatistics(data, '2026-11', '2026-10-12').average, 0);
});
test('debts reference people by ID and stay separate from expense totals', () => {
  const debt = {
    id: 'debt-1',
    title: 'Loan',
    personId: 'person-1',
    direction: 'receivable',
    amount: 100000,
    occurredAt: expense.occurredAt,
    dueAt: '2026-11-05T05:00:00.000Z',
    settledAt: null,
    note: '',
  };
  const data = { ...copy(), people: [{ id: 'person-1', name: 'Person' }], debts: [debt] };
  assert.equal(financeSchema.safeParse(data).success, true);
  assert.equal(getStatistics(data, '2026-10', '2026-10-31').total, 0);
  data.people[0].name = 'Renamed';
  assert.equal(financeSchema.safeParse(data).success, true);
  assert.equal(financeSchema.safeParse({ ...data, people: [] }).success, false);
  assert.equal(
    financeSchema.safeParse({ ...data, debts: [{ ...debt, dueAt: '2026-10-01T00:00:00.000Z' }] })
      .success,
    false,
  );
});
test('legacy backup keeps IDs and migrates dates to Vietnam midnight', () => {
  const data = parseBackup({
    budget: 1000000,
    categories: [{ id: 'food', name: 'Food', color: '#458775' }],
    expenses: [
      { id: 'old-1', amount: 60000, categoryId: 'food', date: '2026-10-05', note: 'Lunch' },
    ],
  });
  assert.equal(data.schemaVersion, 2);
  assert.equal(data.expenses[0].id, 'old-1');
  assert.equal(data.expenses[0].categoryId, 'food');
  assert.equal(data.expenses[0].title, 'Lunch');
  assert.equal(dateKey(data.expenses[0].occurredAt), '2026-10-05');
});
test('malformed modern backup cannot fall back to legacy and discard debt data', () => {
  assert.throws(() =>
    parseBackup({
      ...copy(),
      categories: [{ id: 'food', name: 'Food', color: '#458775', icon: 'unknown' }],
    }),
  );
  assert.throws(() => parseBackup({ ...copy(), schemaVersion: 999 }));
});
test('impossible dates and unknown icons in backups are rejected', () => {
  assert.throws(() =>
    parseBackup({
      budget: 0,
      categories: [{ id: 'food', name: 'Food', color: '#458775' }],
      expenses: [{ id: 'old', amount: 1, categoryId: 'food', date: '2026-02-30', note: '' }],
    }),
  );
  assert.equal(
    financeSchema.safeParse({
      ...copy(),
      categories: [{ ...initialData.categories[0], icon: 'invalid' }],
    }).success,
    false,
  );
});
