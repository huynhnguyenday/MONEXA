import 'server-only';
import type { ClientSession, Collection, Db, TransactionOptions } from 'mongodb';
import { getDatabase, getMongoClient } from '@/lib/mongodb';
import {
  financeSchema,
  initialData,
  PERSONAL_USER_ID,
  type FinanceData,
  type Snapshot,
} from './model';

type EntityKey = 'categories' | 'expenses' | 'people' | 'debts' | 'budgets';
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
  storageVersion: 1;
  updatedAt: Date;
  migratedAt?: Date;
};
type LegacyDocument = { _id: string; data: unknown; revision: number };
const entityKeys: EntityKey[] = ['categories', 'expenses', 'people', 'debts', 'budgets'];
const transactions: TransactionOptions & { timeoutMS: number } = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
  readPreference: 'primary',
  maxCommitTimeMS: 8000,
  timeoutMS: 20000,
};
let indexesReady: Promise<void> | undefined;

function entities(db: Db, key: EntityKey) {
  return db.collection<EntityDocument>(key);
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
        ]),
        entities(db, 'people').createIndex({ userId: 1, name: 1 }),
        entities(db, 'debts').createIndexes([
          { key: { userId: 1, personId: 1 } },
          { key: { userId: 1, settledAt: 1, dueAt: 1 } },
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

async function initialize(db: Db, session: ClientSession) {
  const existing = await settings(db).findOne({ _id: PERSONAL_USER_ID }, { session });
  if (existing) {
    if (existing.storageVersion !== 1 || existing.userId !== PERSONAL_USER_ID)
      throw new Error('UNSUPPORTED_STORAGE_VERSION');
    const hasBudget = await entities(db, 'budgets').findOne({ userId: PERSONAL_USER_ID }, { session });
    if (!hasBudget && existing.budget > 0) {
      const now = new Date();
      await entities(db, 'budgets').insertOne({ _id: 'budget-migration', userId: PERSONAL_USER_ID, cash: existing.budget, bank: 0, recordedAt: now.toISOString(), createdAt: now, updatedAt: now }, { session });
    }
    return existing;
  }
  // A completed settings record is the migration marker. Never overwrite partial/manual data.
  for (const key of entityKeys) {
    if (await entities(db, key).findOne({ userId: PERSONAL_USER_ID }, { session }))
      throw new Error('UNINITIALIZED_EXISTING_DATA');
  }
  const legacy = await db
    .collection<LegacyDocument>('finance')
    .findOne({ _id: 'personal' }, { session });
  const data = financeSchema.parse(legacy?.data || initialData);
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
    storageVersion: 1,
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
          return {
            data: financeSchema.parse({ schemaVersion: 2, budget: state.budget, ...rows }),
            revision: state.revision,
          };
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
  const data = financeSchema.parse(input);
  const db = await getDatabase();
  await ensureIndexes(db);
  return (await getMongoClient()).withSession((session) =>
    session.withTransaction(async () => {
      const updated = await settings(db).findOneAndUpdate(
        { _id: PERSONAL_USER_ID, userId: PERSONAL_USER_ID, storageVersion: 1, revision },
        { $set: { budget: data.budget, updatedAt: new Date() }, $inc: { revision: 1 } },
        { session, returnDocument: 'after' },
      );
      if (!updated) return null;
      for (const key of entityKeys) await syncEntities(entities(db, key), data[key], session);
      return { data, revision: updated.revision };
    }, transactions),
  );
}
