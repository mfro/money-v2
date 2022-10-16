import { Date, Money } from '@/common';
import { PNCAccount, PNCTransaction } from '@/import/pnc';
import { createWebSocketEngine, Collection, makeRef } from '@mfro/sync-vue';
export { Collection, makeRef };

export interface MoneyContext {
  accounts: Collection<Account>;
  tags: Collection<Tag>;
  transactions: Collection<Transaction>;
}

export type Account =
  | { type: 'pnc' } & PNCAccount;

export type TransactionSource =
  | { type: 'pnc', source: PNCTransaction }

export interface Transaction {
  source: TransactionSource;

  value: Money;
  label: string;
  date: Date;
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
    data.transactions = Collection.create();
  }

  return data;
}

export async function open() {
  const url = new URL(location.href);
  const idParam = url.searchParams.get('id');

  const { data, id } = await createWebSocketEngine({
    host: 'wss://api.mfro.me/sync',
    id: idParam ?? undefined,
  });

  if (!idParam) {
    url.searchParams.set('id', id);
    window.history.replaceState(null, '', url.toString());
  }

  return init(data as MoneyContext);
}
