import 'server-only';
import { MongoClient } from 'mongodb';
const globalMongo = globalThis as typeof globalThis & { monexaMongo?: Promise<MongoClient> };
export async function getMongoClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!globalMongo.monexaMongo) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
      serverSelectionTimeoutMS: 8_000,
      connectTimeoutMS: 8_000,
      timeoutMS: 10_000,
    });
    let timeout: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('DATABASE_CONNECTION_TIMEOUT')), 12_000);
    });
    globalMongo.monexaMongo = Promise.race([client.connect(), deadline])
      .catch((error) => {
        globalMongo.monexaMongo = undefined;
        void client.close().catch(() => {});
        throw error;
      })
      .finally(() => clearTimeout(timeout));
  }
  return globalMongo.monexaMongo;
}
export async function getDatabase() {
  return (await getMongoClient()).db(process.env.MONGODB_DB || 'monexa');
}
