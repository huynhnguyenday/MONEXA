import 'server-only';
import type { ClientSession, Collection, Db, TransactionOptions } from 'mongodb';
import { getDatabase, getMongoClient } from '@/lib/mongodb';
import {
  financeSchema,
  calculateBalance,
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

type EntityKey = 'categories' | 'expenses' | 'debtSources' | 'debtTypes' | 'debts' | 'budgets';
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
};
type LegacyDocument = { _id: string; data: unknown; revision: number };
const entityKeys: EntityKey[] = ['categories', 'expenses', 'debtSources', 'debtTypes', 'debts', 'budgets'];
const transactions: TransactionOptions & { timeoutMS: number } = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
  readPreference: 'primary',
  maxCommitTimeMS: 8000,
  timeoutMS: 20000,
};
let indexesReady: Promise<void> | undefined;

function entities(db: Db, key: EntityKey) {
  const collection = key === 'debtSources' ? 'debt_sources' : key === 'debtTypes' ? 'debt_types' : key;
  return db.collection<EntityDocument>(collection);
}
function settings(db: Db) {
  return db.collection<SettingsDocument>('settings');
}

async function ensureIndexes(db: Db) {
  if (!indexesReady) {
    indexesReady = (async () => {
      await Promise.all([
        db.collection<UserDocument>('users').createIndex({ createdAt: 1 }),
        settings(db).createIndex({ userId: 1 }, { unique: true }),
        entities(db, 'categories').createIndex({ userId: 1, name: 1 }),
        entities(db, 'expenses').createIndexes([
          { key: { userId: 1, occurredAt: -1 } },
          { key: { userId: 1, categoryId: 1 } },
          { key: { userId: 1, debtId: 1 }, unique: true, partialFilterExpression: { debtId: { $type: 'string' } } },
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
) {
  const previous = await collection.find({ userId: PERSONAL_USER_ID }, { session }).toArray();
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
  const oldDebts = await entities(db, 'debts').find({
    userId: PERSONAL_USER_ID,
    $or: [{ direction: { $exists: true } }, { debtTypeId: { $exists: false } }],
  }, { session }).toArray();
  for (const debt of oldDebts) {
    const debtTypeId = debt.debtTypeId || (debt.direction === 'receivable' ? 'debt-type-lend' : 'debt-type-borrow');
    await entities(db, 'debts').updateOne(
      { _id: debt._id, userId: PERSONAL_USER_ID },
      { $set: { debtTypeId }, $unset: { direction: '', personId: '' } },
      { session },
    );
  }
}

async function migrateDebtDueDates(db: Db, session: ClientSession) {
  const oldDebts = await entities(db, 'debts').find({
    userId: PERSONAL_USER_ID,
    $or: [{ dueAt: { $exists: true } }, { dueDate: { $exists: false } }],
  }, { session }).toArray();
  for (const debt of oldDebts) {
    const currentDate = typeof debt.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(debt.dueDate)
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
  const sources = await entities(db, 'debtSources').find({ userId: PERSONAL_USER_ID }, { session }).toArray();
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
    if (existing.storageVersion < 3) {
      if (existing.storageVersion === 1) {
        const oldSources = await db.collection<EntityDocument>('people').find({ userId: PERSONAL_USER_ID }, { session }).toArray();
        for (const source of oldSources) {
          const icon = inferDebtSourceIcon(String(source.name || ''));
          const now = new Date();
          await entities(db, 'debtSources').updateOne(
            { _id: source._id, userId: PERSONAL_USER_ID },
            { $setOnInsert: {
              userId: PERSONAL_USER_ID,
              name: source.name,
              color: debtSourceIconColors[icon],
              icon,
              createdAt: source.createdAt || now,
              updatedAt: source.updatedAt || now,
            } },
            { upsert: true, session },
          );
        }
        const oldDebts = await entities(db, 'debts').find({ userId: PERSONAL_USER_ID, personId: { $exists: true } }, { session }).toArray();
        for (const debt of oldDebts) {
          await entities(db, 'debts').updateOne(
            { _id: debt._id, userId: PERSONAL_USER_ID },
            { $set: { debtSourceId: debt.debtSourceId || debt.personId }, $unset: { personId: '' } },
            { session },
          );
        }
      }
      await styleDebtSources(db, session);
      await ensureDebtTypes(db, session);
      await migrateDebtTypeReferences(db, session);
      const hasBudget = await entities(db, 'budgets').findOne({ userId: PERSONAL_USER_ID }, { session });
      if (!hasBudget && existing.budget > 0) {
        const now = new Date();
        await entities(db, 'budgets').insertOne({
          _id: 'budget-migration', userId: PERSONAL_USER_ID, cash: existing.budget, bank: 0,
          recordedAt: now.toISOString(), createdAt: now, updatedAt: now,
        }, { session });
      }
    }
    if (existing.storageVersion < 4) await migrateDebtDueDates(db, session);
    const hasBudget = await entities(db, 'budgets').findOne({ userId: PERSONAL_USER_ID }, { session });
    if (!hasBudget && existing.budget > 0) {
      const now = new Date();
      await entities(db, 'budgets').insertOne({ _id: 'budget-migration', userId: PERSONAL_USER_ID, cash: existing.budget, bank: 0, recordedAt: now.toISOString(), createdAt: now, updatedAt: now }, { session });
    }
    if (existing.storageVersion < 4) {
      await settings(db).updateOne(
        { _id: PERSONAL_USER_ID, userId: PERSONAL_USER_ID, storageVersion: existing.storageVersion },
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
  if (!data.budgets.length && data.budget > 0) data.budgets.push({
    id: 'budget-migration', userId: PERSONAL_USER_ID, cash: data.budget, bank: 0,
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
  const result: Record<string, unknown[]> = {};
  for (const key of entityKeys) {
    const records = await entities(db, key)
      .find({ userId: PERSONAL_USER_ID }, { session })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();
    result[key] = records.map(({ _id, createdAt, updatedAt, ...record }) => ({
      ...record,
      id: _id,
    }));
  }
  return result;
}

/** Server-owned balance commits with the source documents and revision. */
async function reconcileBalance(db: Db, data: FinanceData, session: ClientSession) {
  data.balance = calculateBalance(data);
  if (!Number.isSafeInteger(data.balance)) throw new Error('INVALID_BALANCE');
  await db.collection<EntityDocument>('balances').updateOne(
    { _id: PERSONAL_USER_ID, userId: PERSONAL_USER_ID },
    { $set: { total: data.balance, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() } },
    { upsert: true, session },
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
          const balance = await db.collection<EntityDocument>('balances').findOne(
            { _id: PERSONAL_USER_ID, userId: PERSONAL_USER_ID }, { session },
          );
          if (!balance) await reconcileBalance(db, data, session);
          else {
            if (typeof balance.total !== 'number' || !Number.isSafeInteger(balance.total)) throw new Error('INVALID_BALANCE');
            data.balance = balance.total;
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

export async function writeFinance(input: FinanceData, revision: number): Promise<Snapshot | null> {
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
      const previous = financeSchema.parse({ schemaVersion: 3, budget: updated.budget, ...await readEntities(db, session) });
      data = reconcileDebtExpenses(previous, data);
      for (const key of entityKeys) await syncEntities(entities(db, key), data[key], session);
      await reconcileBalance(db, data, session);
      return { data, revision: updated.revision };
    }, transactions),
  );
}
