import 'server-only';
import type { ClientSession, Collection, Db, TransactionOptions } from 'mongodb';
import { getDatabase, getMongoClient } from '@/lib/mongodb';
import { financeReadPipeline, financeCollections } from './finance-read-query';
import { calculateFunds, defaultFunds } from './income-model';
import { syncDebtReminders } from './notifications/reminder-schedule';
import { createPushIndexes } from './notifications/push-repository';
import {
  financeSchema,
  calculateAccounts,
  reconcileDebtExpenses,
  defaultDebtTypes,
  debtSourceIconColors,
  inferDebtSourceIcon,
  initialData,
  PERSONAL_USER_ID,
  dateKey,
  parseBackup,
  type FinanceData,
  type Snapshot,
} from './model';

type EntityKey = keyof typeof financeCollections;
type Entity = FinanceData[EntityKey][number];
type EntityDocument = {
  _id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
};
type UserDocument = { _id: string; name: string; createdAt: Date };
type SettingsDocument = {
  _id: string;
  userId: string;
  budget: number;
  revision: number;
  storageVersion: 1 | 2 | 3 | 4;
  updatedAt: Date;
  migratedAt?: Date;
  indexesVersion?: number;
  pushScheduleVersion?: number;
};
type LegacyDocument = { _id: string; data: unknown; revision: number };
const entityKeys = Object.keys(financeCollections) as EntityKey[];
const transactions: TransactionOptions & { timeoutMS: number } = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
  readPreference: 'primary',
  maxCommitTimeMS: 8000,
  timeoutMS: 20000,
};
let indexesReady: Promise<void> | undefined;
const INDEXES_VERSION = 4;

function entities(db: Db, key: EntityKey) {
  const collection = financeCollections[key];
  return db.collection<EntityDocument>(collection);
}
function settings(db: Db) {
  return db.collection<SettingsDocument>('settings');
}

async function ensureIndexes(db: Db) {
  if (!indexesReady) {
    indexesReady = (async () => {
      // Indexes persist in MongoDB across serverless cold starts. Only the first
      // schema setup needs to issue createIndexes for every collection.
      const installed = await settings(db).findOne(
        { _id: PERSONAL_USER_ID, userId: PERSONAL_USER_ID, indexesVersion: INDEXES_VERSION },
        { projection: { _id: 1 }, readConcern: { level: 'majority' } },
      );
      if (installed) return;
      await createPushIndexes(db);
      await Promise.all([
        db.collection<UserDocument>('users').createIndex({ createdAt: 1 }),
        settings(db).createIndex({ userId: 1 }, { unique: true }),
        ...entityKeys.map((key) =>
          entities(db, key).createIndex({ userId: 1, createdAt: 1, _id: 1 }),
        ),
        db.collection('fund_balances').createIndex({ userId: 1, fundId: 1 }, { unique: true }),
        entities(db, 'budgets').createIndex(
          { userId: 1, transferId: 1 },
          { unique: true, partialFilterExpression: { transferId: { $type: 'string' } } },
        ),
        entities(db, 'categories').createIndex({ userId: 1, name: 1 }),
        entities(db, 'expenses').createIndexes([
          { key: { userId: 1, occurredAt: -1 } },
          { key: { userId: 1, categoryId: 1 } },
          {
            key: { userId: 1, debtId: 1 },
            unique: true,
            partialFilterExpression: { debtId: { $type: 'string' } },
          },
        ]),
        entities(db, 'debtSources').createIndex({ userId: 1, name: 1 }),
        entities(db, 'debtTypes').createIndex({ userId: 1, name: 1 }),
        entities(db, 'debts').createIndexes([
          { key: { userId: 1, debtSourceId: 1 } },
          { key: { userId: 1, debtTypeId: 1 } },
          { key: { userId: 1, settledAt: 1, dueDate: 1 } },
        ]),
      ]);
    })().catch((error) => {
      indexesReady = undefined;
      throw error;
    });
  }
  await indexesReady;
}

/** Keep each entity as one document; only insert/update/delete changed records. */
async function syncEntities(
  collection: Collection<EntityDocument>,
  items: Entity[],
  session: ClientSession,
  snapshot?: Entity[],
) {
  // The caller already read these records in this transaction's snapshot.
  // Reuse that authoritative state instead of reading every collection again.
  const previous: { _id: string; [key: string]: unknown }[] = snapshot
    ? snapshot.map(({ id, ...fields }) => ({ ...fields, _id: id }))
    : await collection.find({ userId: PERSONAL_USER_ID }, { session }).toArray();
  const byId = new Map(previous.map((record) => [record._id, record]));
  const now = new Date();
  const operations = items.flatMap((item) => {
    const { id, ...fields } = item;
    const old = byId.get(id);
    if (old && Object.entries(fields).every(([key, value]) => old[key] === value)) return [];
    return [
      {
        updateOne: {
          filter: { _id: id, userId: PERSONAL_USER_ID },
          update: { $set: { ...fields, updatedAt: now }, $setOnInsert: { createdAt: now } },
          upsert: true,
        },
      },
    ];
  });
  if (operations.length) await collection.bulkWrite(operations, { session, ordered: true });
  const ids = new Set(items.map((item) => item.id));
  const removed = previous.filter((record) => !ids.has(record._id)).map((record) => record._id);
  if (removed.length)
    await collection.deleteMany({ userId: PERSONAL_USER_ID, _id: { $in: removed } }, { session });
}

async function ensureDebtTypes(db: Db, session: ClientSession) {
  const now = new Date();
  for (const type of defaultDebtTypes) {
    const { id, ...fields } = type;
    await entities(db, 'debtTypes').updateOne(
      { _id: id, userId: PERSONAL_USER_ID },
      { $setOnInsert: { ...fields, userId: PERSONAL_USER_ID, createdAt: now, updatedAt: now } },
      { upsert: true, session },
    );
  }
}

async function migrateDebtTypeReferences(db: Db, session: ClientSession) {
  const oldDebts = await entities(db, 'debts')
    .find(
      {
        userId: PERSONAL_USER_ID,
        $or: [{ direction: { $exists: true } }, { debtTypeId: { $exists: false } }],
      },
      { session },
    )
    .toArray();
  for (const debt of oldDebts) {
    const debtTypeId =
      debt.debtTypeId || (debt.direction === 'receivable' ? 'debt-type-lend' : 'debt-type-borrow');
    await entities(db, 'debts').updateOne(
      { _id: debt._id, userId: PERSONAL_USER_ID },
      { $set: { debtTypeId }, $unset: { direction: '', personId: '' } },
      { session },
    );
  }
}

async function migrateDebtDueDates(db: Db, session: ClientSession) {
  const oldDebts = await entities(db, 'debts')
    .find(
      {
        userId: PERSONAL_USER_ID,
        $or: [{ dueAt: { $exists: true } }, { dueDate: { $exists: false } }],
      },
      { session },
    )
    .toArray();
  for (const debt of oldDebts) {
    const currentDate =
      typeof debt.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(debt.dueDate)
        ? debt.dueDate
        : typeof debt.dueAt === 'string' && debt.dueAt
          ? dateKey(debt.dueAt)
          : null;
    await entities(db, 'debts').updateOne(
      { _id: debt._id, userId: PERSONAL_USER_ID },
      { $set: { dueDate: currentDate }, $unset: { dueAt: '' } },
      { session },
    );
  }
}

async function styleDebtSources(db: Db, session: ClientSession) {
  const sources = await entities(db, 'debtSources')
    .find({ userId: PERSONAL_USER_ID }, { session })
    .toArray();
  for (const source of sources) {
    const icon = inferDebtSourceIcon(String(source.name || ''));
    await entities(db, 'debtSources').updateOne(
      { _id: source._id, userId: PERSONAL_USER_ID },
      { $set: { icon, color: debtSourceIconColors[icon] } },
      { session },
    );
  }
}

async function initialize(db: Db, session: ClientSession) {
  const existing = await settings(db).findOne({ _id: PERSONAL_USER_ID }, { session });
  if (existing) {
    if (![1, 2, 3, 4].includes(existing.storageVersion) || existing.userId !== PERSONAL_USER_ID)
      throw new Error('UNSUPPORTED_STORAGE_VERSION');
    // Add identities only; never infer income from old spending money.
    for (const fund of defaultFunds) {
      const { id, ...fields } = fund;
      await entities(db, 'funds').updateOne(
        { _id: id, userId: PERSONAL_USER_ID },
        { $setOnInsert: { ...fields, createdAt: new Date(), updatedAt: new Date() } },
        { session, upsert: true },
      );
    }
    // Publish the marker only inside the successful initialization transaction.
    if (existing.indexesVersion !== INDEXES_VERSION) {
      await settings(db).updateOne(
        { _id: PERSONAL_USER_ID, userId: PERSONAL_USER_ID },
        { $set: { indexesVersion: INDEXES_VERSION } },
        { session },
      );
    }
    if (existing.storageVersion < 3) {
      if (existing.storageVersion === 1) {
        const oldSources = await db
          .collection<EntityDocument>('people')
          .find({ userId: PERSONAL_USER_ID }, { session })
          .toArray();
        for (const source of oldSources) {
          const icon = inferDebtSourceIcon(String(source.name || ''));
          const now = new Date();
          await entities(db, 'debtSources').updateOne(
            { _id: source._id, userId: PERSONAL_USER_ID },
            {
              $setOnInsert: {
                userId: PERSONAL_USER_ID,
                name: source.name,
                color: debtSourceIconColors[icon],
                icon,
                createdAt: source.createdAt || now,
                updatedAt: source.updatedAt || now,
              },
            },
            { upsert: true, session },
          );
        }
        const oldDebts = await entities(db, 'debts')
          .find({ userId: PERSONAL_USER_ID, personId: { $exists: true } }, { session })
          .toArray();
        for (const debt of oldDebts) {
          await entities(db, 'debts').updateOne(
            { _id: debt._id, userId: PERSONAL_USER_ID },
            {
              $set: { debtSourceId: debt.debtSourceId || debt.personId },
              $unset: { personId: '' },
            },
            { session },
          );
        }
      }
      await styleDebtSources(db, session);
      await ensureDebtTypes(db, session);
      await migrateDebtTypeReferences(db, session);
      const hasBudget = await entities(db, 'budgets').findOne(
        { userId: PERSONAL_USER_ID },
        { session },
      );
      if (!hasBudget && existing.budget > 0) {
        const now = new Date();
        await entities(db, 'budgets').insertOne(
          {
            _id: 'budget-migration',
            userId: PERSONAL_USER_ID,
            cash: existing.budget,
            bank: 0,
            recordedAt: now.toISOString(),
            createdAt: now,
            updatedAt: now,
          },
          { session },
        );
      }
    }
    if (existing.storageVersion < 4) await migrateDebtDueDates(db, session);
    // Current empty funding history is intentional. Only the old-version migration
    // above may recover funding from the compatibility settings.budget field.
    if (existing.storageVersion < 4) {
      await settings(db).updateOne(
        {
          _id: PERSONAL_USER_ID,
          userId: PERSONAL_USER_ID,
          storageVersion: existing.storageVersion,
        },
        { $set: { storageVersion: 4, updatedAt: new Date() } },
        { session },
      );
      return { ...existing, storageVersion: 4 as const };
    }
    return existing;
  }
  // A completed settings record is the migration marker. Never overwrite partial/manual data.
  if (await db.collection('people').findOne({ userId: PERSONAL_USER_ID }, { session }))
    throw new Error('UNINITIALIZED_EXISTING_DATA');
  for (const key of entityKeys) {
    if (await entities(db, key).findOne({ userId: PERSONAL_USER_ID }, { session }))
      throw new Error('UNINITIALIZED_EXISTING_DATA');
  }
  const legacy = await db
    .collection<LegacyDocument>('finance')
    .findOne({ _id: 'personal' }, { session });
  const data = legacy ? parseBackup(legacy.data) : initialData;
  if (!data.budgets.length && data.budget > 0)
    data.budgets.push({
      id: 'budget-migration',
      userId: PERSONAL_USER_ID,
      cash: data.budget,
      bank: 0,
      recordedAt: new Date().toISOString(),
    });
  if (legacy && (!Number.isSafeInteger(legacy.revision) || legacy.revision < 0))
    throw new Error('INVALID_LEGACY_REVISION');
  const now = new Date();
  const state: SettingsDocument = {
    _id: PERSONAL_USER_ID,
    userId: PERSONAL_USER_ID,
    budget: data.budget,
    revision: legacy?.revision || 0,
    storageVersion: 4,
    indexesVersion: INDEXES_VERSION,
    updatedAt: now,
    ...(legacy ? { migratedAt: now } : {}),
  };
  await settings(db).insertOne(state, { session });
  await db
    .collection<UserDocument>('users')
    .updateOne(
      { _id: PERSONAL_USER_ID },
      { $setOnInsert: { name: 'Cá nhân', createdAt: now } },
      { upsert: true, session },
    );
  for (const key of entityKeys) await syncEntities(entities(db, key), data[key], session);
  // Preserve finance/personal as an untouched recovery copy after migration.
  return state;
}

async function readEntities(db: Db, session: ClientSession) {
  const joined = await settings(db)
    .aggregate<Record<EntityKey, EntityDocument[]>>(financeReadPipeline(PERSONAL_USER_ID), {
      session,
    })
    .next();
  if (!joined) throw new Error('UNINITIALIZED_EXISTING_DATA');
  const result: Record<string, unknown[]> = {};
  for (const key of entityKeys) {
    result[key] = joined[key].map(({ _id, ...record }) => ({
      ...record,
      id: _id,
    }));
  }
  return result;
}

/** Server-owned balance commits with the source documents and revision. */
async function reconcileBalance(db: Db, data: FinanceData, session: ClientSession) {
  const accounts = calculateAccounts(data);
  data.balance = accounts.total;
  if (!Number.isSafeInteger(data.balance)) throw new Error('INVALID_BALANCE');
  await db
    .collection<EntityDocument>('balances')
    .updateOne(
      { _id: PERSONAL_USER_ID, userId: PERSONAL_USER_ID },
      { $set: { ...accounts, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, session },
    );
}

/** Never overwrite evidence of an existing discrepancy during a new payment. */
async function assertStoredBalance(db: Db, data: FinanceData, session: ClientSession) {
  const stored = await db
    .collection<EntityDocument>('balances')
    .findOne({ _id: PERSONAL_USER_ID, userId: PERSONAL_USER_ID }, { session });
  const expected = calculateAccounts(data);
  if (
    stored &&
    (stored.total !== expected.total ||
      (stored.cash !== undefined && stored.cash !== expected.cash) ||
      (stored.bank !== undefined && stored.bank !== expected.bank))
  )
    throw new Error('BALANCE_MISMATCH');
  return stored;
}

/** Separate ledgers; mismatch is evidence, not permission to overwrite balances. */
async function reconcileFundBalances(
  db: Db,
  data: FinanceData,
  session: ClientSession,
  write: boolean,
) {
  const expected = calculateFunds(data);
  if (write) {
    const now = new Date();
    await db.collection<EntityDocument>('fund_balances').bulkWrite(
      (['unallocated', 'savings'] as const).map((fundId) => ({
        updateOne: {
          filter: { _id: fundId, userId: PERSONAL_USER_ID },
          update: {
            $set: { ...expected[fundId], fundId, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        },
      })),
      { session, ordered: true },
    );
    return;
  }
  for (const fundId of ['unallocated', 'savings'] as const) {
    const collection = db.collection<EntityDocument>('fund_balances');
    const stored = await collection.findOne({ _id: fundId, userId: PERSONAL_USER_ID }, { session });
    const value = expected[fundId];
    if (
      stored &&
      (stored.total !== value.total || stored.cash !== value.cash || stored.bank !== value.bank)
    )
      throw new Error('BALANCE_MISMATCH');
    if (
      !stored &&
      (value.total !== 0 ||
        data.incomes.length ||
        data.fundTransfers.length ||
        data.familySupports.length)
    )
      throw new Error('BALANCE_MISMATCH');
    if (!stored)
      await collection.updateOne(
        { _id: fundId, userId: PERSONAL_USER_ID },
        {
          $set: { ...value, fundId, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, session },
      );
  }
}

function assertBudgetChanges(previous: FinanceData, next: FinanceData, replace: boolean) {
  if (replace) return;
  const old = new Map(previous.budgets.map((b) => [b.id, b]));
  for (const b of next.budgets) {
    if (!b.transferId && !old.has(b.id)) throw new Error('UNLINKED_BUDGET');
    if (!b.transferId && old.get(b.id)?.transferId) throw new Error('UNLINKED_BUDGET');
    if (!b.transferId && JSON.stringify(old.get(b.id)) !== JSON.stringify(b))
      throw new Error('UNLINKED_BUDGET');
  }
  // Refunding a funding transfer must not withdraw money already spent.
  const before = calculateAccounts(previous),
    after = calculateAccounts(next);
  for (const method of ['cash', 'bank'] as const) {
    const reduction =
      previous.budgets.reduce((s, b) => s + (b.transferId ? b[method] : 0), 0) -
      next.budgets.reduce((s, b) => s + (b.transferId ? b[method] : 0), 0) +
      spendingOut(next, method) -
      spendingOut(previous, method);
    if (reduction > 0 && after[method] < 0 && after[method] < before[method])
      throw new Error('SPENT_BUDGET');
  }
}

function spendingOut(data: FinanceData, method: 'cash' | 'bank') {
  return (
    data.fundTransfers
      .filter((t) => t.fromFundId === 'spending' && t.paymentMethod === method)
      .reduce((sum, t) => sum + t.amount, 0) +
    data.familySupports
      .filter((s) => s.sourceFundId === 'spending' && s.paymentMethod === method)
      .reduce((sum, s) => sum + s.amount, 0)
  );
}

/** Lightweight change check; application writes increment revision in the same transaction. */
export async function readFinanceRevision(): Promise<number | null> {
  const db = await getDatabase();
  const state = await settings(db).findOne(
    { _id: PERSONAL_USER_ID, userId: PERSONAL_USER_ID, storageVersion: 4 },
    { projection: { revision: 1 }, readConcern: { level: 'majority' } },
  );
  return state?.revision ?? null;
}

export async function readFinance(): Promise<Snapshot> {
  const db = await getDatabase();
  await ensureIndexes(db);
  const client = await getMongoClient();
  // Concurrent first-time requests can race on the unique migration marker; retry once.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await client.withSession((session) =>
        session.withTransaction(async () => {
          const state = await initialize(db, session);
          const rows = await readEntities(db, session);
          const data = financeSchema.parse({ schemaVersion: 3, budget: state.budget, ...rows });
          const balance = await assertStoredBalance(db, data, session);
          await reconcileFundBalances(db, data, session, false);
          if (state.pushScheduleVersion !== 4) {
            await syncDebtReminders(db, data.debts, session);
            await settings(db).updateOne(
              { _id: PERSONAL_USER_ID, userId: PERSONAL_USER_ID, revision: state.revision },
              { $set: { pushScheduleVersion: 4 } },
              { session },
            );
          }
          const expected = calculateAccounts(data);
          if (!balance || balance.cash === undefined || balance.bank === undefined)
            await reconcileBalance(db, data, session);
          else {
            if (
              balance.total !== expected.total ||
              balance.cash !== expected.cash ||
              balance.bank !== expected.bank
            )
              throw new Error('BALANCE_MISMATCH');
            data.balance = expected.total;
          }
          return { data, revision: state.revision };
        }, transactions),
      );
    } catch (error) {
      if (
        attempt === 0 &&
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 11000
      )
        continue;
      throw error;
    }
  }
  throw new Error('INITIALIZATION_FAILED');
}

export async function writeFinance(
  input: FinanceData,
  revision: number,
  replace = false,
): Promise<Snapshot | null> {
  if (!replace && !Object.hasOwn(input, 'budgetExchanges')) throw new Error('MISSING_EXCHANGES');
  let data = financeSchema.parse(input);
  const db = await getDatabase();
  await ensureIndexes(db);
  return (await getMongoClient()).withSession((session) =>
    session.withTransaction(async () => {
      const updated = await settings(db).findOneAndUpdate(
        { _id: PERSONAL_USER_ID, userId: PERSONAL_USER_ID, storageVersion: 4, revision },
        { $set: { budget: data.budget, updatedAt: new Date() }, $inc: { revision: 1 } },
        { session, returnDocument: 'after' },
      );
      if (!updated) return null;
      const previous = financeSchema.parse({
        schemaVersion: 3,
        budget: updated.budget,
        ...(await readEntities(db, session)),
      });
      await assertStoredBalance(db, previous, session);
      await reconcileFundBalances(db, previous, session, false);
      data = reconcileDebtExpenses(previous, data);
      assertBudgetChanges(previous, data, replace);
      if (!replace) {
        const next = new Map(data.budgetExchanges.map((entry) => [entry.id, entry]));
        for (const entry of previous.budgetExchanges)
          if (JSON.stringify(next.get(entry.id)) !== JSON.stringify(entry))
            throw new Error('EXCHANGE_HISTORY_CHANGED');
        const accounts = calculateAccounts(previous);
        const oldIds = new Set(previous.budgetExchanges.map((entry) => entry.id));
        for (const entry of data.budgetExchanges
          .filter((entry) => !oldIds.has(entry.id))
          .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id))) {
          if (accounts[entry.from] < entry.amount) throw new Error('INSUFFICIENT_EXCHANGE');
          accounts[entry.from] -= entry.amount;
          accounts[entry.to] += entry.amount;
        }
      }
      for (const key of entityKeys)
        await syncEntities(entities(db, key), data[key], session, previous[key]);
      await reconcileBalance(db, data, session);
      await reconcileFundBalances(db, data, session, true);
      await syncDebtReminders(db, data.debts, session, previous.debts);
      return { data, revision: updated.revision };
    }, transactions),
  );
}
