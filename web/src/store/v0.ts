import { Date, Money } from '@/common';
import { Collection } from '@mfro/sync-vue';

export interface MoneyContext {
  version: number;
  accounts: Collection<Account>;
  tags: Collection<Tag>;
}

export interface Account {
  description: string;
  imports: Collection<Import>;
  transactions: Collection<Transaction>;
}

export interface Import {
  account: Account;
  description: string;
  key: string;
}

export interface Transaction {
  import: Import;
  tags: Collection<Tag>;
  label: string | null;

  date: Date;
  description: string;
  value: Money;
}

export interface Tag {
  tags: Collection<Tag>;

  name: string;
}

export function init(old: {}) {
  const data = old as MoneyContext;

  if (data.version === undefined) {
    data.version = 0;
    data.accounts = Collection.create();
    data.tags = Collection.create();
  }

  return data
}
