import { Date, Money } from '@/common';
import { Collection } from '@mfro/sync-vue';
import * as v0 from './v0';

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
  parts: Collection<TransactionPart>;

  date: Date;
  description: string;
  value: Money;
}

export interface TransactionPart {
  ratio: number;
  label: string | null;
  tags: Collection<Tag>;
}

export interface Tag {
  tags: Collection<Tag>;

  name: string;
}

export function init(o: {}) {
  const old = v0.init(o);
  const data = old as any as MoneyContext;

  if (data.version === 0) {
    data.version = 1;

    for (const a0 of old.accounts.array()) {
      const a1 = data.accounts.get(a0.id);

      for (const t0 of a0.transactions.array()) {
        const t1 = a1.transactions.get(t0.id);

        t1.parts = Collection.create();
        t1.parts.insert({
          label: t0.label,
          ratio: 1,
          tags: t0.tags,
        });

        delete (t0 as any).label;
        delete (t0 as any).tags;
      }
    }
  }

  return data
}
