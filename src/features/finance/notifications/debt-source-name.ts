import type { Db } from 'mongodb';
import { PERSONAL_USER_ID } from '../model';

export async function readDebtSourceName(db: Db, id?: string): Promise<string | undefined> {
  if (!id) return undefined;
  const source = await db
    .collection<{ _id: string; userId: string; name: string }>('debt_sources')
    .findOne({ _id: id, userId: PERSONAL_USER_ID }, { projection: { name: 1 } });
  return source?.name;
}
