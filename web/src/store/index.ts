import { Date, Money } from '@/common';
import { join_new, join, Collection } from '@mfro/sync-vue';
export { Collection };

export interface MoneyContext {
  accounts: Collection<Account>;
  transactions: Collection<Transaction>;
  tags: Collection<Tag>;
}

export interface Account {
  description: string;
  imports: Collection<Import>;
}

export interface Import {
  account: Account;
  transactions: Collection<ImportTransaction>;

  description: string;
  key: string;
}

export interface ImportTransaction {
  date: Date;
  value: Money;
  description: string;
}

export type TransactionSource =
  | { type: 'import', source: ImportTransaction }

export interface Transaction {
  source: TransactionSource;
  value: Money;
  label: string | null;
  tags: Collection<Tag>;
}

export interface Tag {
  tags: Collection<Tag>;

  name: string;
}

function init(data: MoneyContext) {
  if (!data.accounts) {
    data.accounts = Collection.create();
    data.tags = Collection.create();
  }

  return data;
}

export async function open() {
  const url = new URL(location.href);
  const idParam = url.searchParams.get('id');

  if (idParam) {
    const { data } = await join('wss://api.mfro.me/sync', idParam);
    return init(data as MoneyContext);
  } else {
    const { data, id } = await join_new('wss://api.mfro.me/sync');

    url.searchParams.set('id', id);
    window.history.replaceState(null, '', url.toString());

    return init(data as MoneyContext);
  }
}
