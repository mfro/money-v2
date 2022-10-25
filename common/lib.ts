import { Transaction as PlaidTransaction } from 'plaid';
import { assert } from '@mfro/assert';
import { Collection, Map } from '@mfro/sync-vue';

export interface Context {
  plaid: {
    token: PlaidState;
    transactions: Map<PlaidTransaction>;
    transactions_sync_cursor: string | null;
  };

  tags: Collection<Tag>;
  transactions: Collection<Transaction>;
}

export type PlaidState =
  | { type: 'none' }
  | { type: 'link', value: string }
  | { type: 'public', value: string }
  | { type: 'access', value: string }

export interface Transaction {
  source: PlaidTransaction;

  value: Money;
  label: string;
  tags: Collection<Tag>;
}

export interface Tag {
  tags: Collection<Tag>;
  name: string;
}

export interface Money {
  cents: number;
}

export namespace Money {
  export function load(raw: string): Money {
    if (raw == '')
      return { cents: 0 };

    const match = /^\$([\d,]+)\.(\d{2})$/.exec(raw);
    assert(match != null, 'invalid money: ' + raw);

    const dollars = parseInt(match[1].replace(/,/g, ''));
    const cents = parseInt(match[2]);

    return { cents: dollars * 100 + cents };
  }

  export function save(value: Money): string {
    if (value.cents == 0)
      return '$0';

    let c = value.cents;
    const negative = c < 0;
    if (negative) c = -c;

    let cents = (c % 100).toString();
    let dollars = Math.floor(c / 100).toString();

    cents = '0'.repeat(2 - cents.length) + cents;

    for (let i = dollars.length - 3; i > 0; i -= 4) {
      dollars = dollars.substr(0, i) + ',' + dollars.substr(i);
    }

    return (negative ? '-' : '') + '$' + dollars + '.' + cents;
  }

  export function eq(a: Money, b: Money) {
    return a.cents == b.cents;
  }
}
