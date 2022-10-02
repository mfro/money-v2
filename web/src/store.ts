import { join_new, join, Collection } from '@mfro/sync-vue';
import { Date, Money } from './common';

export { Collection };

export interface MoneyContext {
  version: number;
  accounts: Collection<Account>;
  imports: Collection<Import>;
  transactions: Collection<Transaction>;
  tags: Collection<Tag>;
}

export interface Account {
  description: string;
}

export interface Import {
  accountId: number;
  description: string;
  key: string;
}

export interface Transaction {
  importId: number;
  tagIds: number[];

  label: string | null;

  date: Date;
  description: string;
  value: Money;
}

export interface Tag {
  tagIds: number[];

  name: string;
}

function init(id: string, data: {}) {
  const context = data as MoneyContext;

  if (context.version == 2) {
    console.log('loaded version 2');
  } else if (context.version == 1) {
    console.log('migrating version 1');

    const old = context as any;
    delete old.labels;

    for (const t of Collection.array<any>(old.transactions)) {
      delete t.labelId;
      t.tagIds = [];
      t.label = null;
    }

    for (const t of Collection.array<any>(old.tags)) {
      t.tagIds = [];
    }

    context.version = 2;
  } else {
    console.log('creating repo');

    context.version = 2;
    context.accounts = Collection.create();
    context.imports = Collection.create();
    context.transactions = Collection.create();
    context.tags = Collection.create();
  }

  return context;
}

export async function open() {
  const url = new URL(location.href);
  const idParam = url.searchParams.get('id');

  if (idParam) {
    const { data } = await join('ws://box:8081', idParam);
    return init(idParam, data);
  } else {
    const { data, id } = await join_new('ws://box:8081');

    url.searchParams.set('id', id);
    window.history.replaceState(null, '', url.toString());

    return init(id, data);
  }
}
