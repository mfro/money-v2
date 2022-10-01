import { MongoClient, ObjectId } from 'mongodb';
import { Date, Money } from './common';

export type Mongo = Awaited<ReturnType<typeof connect>>;

export interface Account {
  description: string;
}

export interface Import {
  accountId: ObjectId;
  id: string;
}

export interface Transaction {
  date: Date;
  value: Money;
  description: string;

  accountId: ObjectId;
  importId?: ObjectId;
  labelId?: ObjectId;
}

export interface Tag {
  name: string;
}

export interface Label {
  description: string;
  tags: ObjectId[];
}

export async function connect() {
  const client = new MongoClient('mongodb://localhost:27017/');

  await client.connect();

  const db = client.db('money');

  const session = client.startSession();

  return {
    client,
    session,

    accounts: db.collection<Account>('accounts'),
    transactions: db.collection<Transaction>('transactions'),
    imports: db.collection<Import>('imports'),
    labels: db.collection<Label>('labels'),
    tags: db.collection<Tag>('tags'),
  };
}
