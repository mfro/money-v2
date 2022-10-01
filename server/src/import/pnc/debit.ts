import { PDF } from 'pdf2json';
import { assert } from '@mfro/ts-common/assert';
import { Money } from '@/common';
import { Transaction } from '@/mongo';

import { column, row, TextNode } from '../common';

export function parsePNCDebitStatement(document: PDF, year: number) {
  const pages: TextNode[][] = document.Pages.map(p => p.Texts.map(t => ({ ...t, value: decodeURIComponent(t.R[0].T) })));

  const headerPage = pages.find(p => p.some(t => t.value == 'Balance Summary'));
  const header = headerPage!.findIndex(t => t.value == 'Balance Summary');
  assert(header != -1, 'bank statement header');

  function parseDefault(text: TextNode[], sign: number) {
    return (entry: TextNode[]) => {
      const match = /(\d\d)\/(\d\d)/.exec(entry[0].value);
      assert(match != null, 'default parse');

      const month = parseInt(match[1]);
      const day = parseInt(match[2]);

      const description = entry.slice(2).map(e => e.value).join(' ');
      const value = Money.load(`$0${entry[1].value}`);
      value.cents *= sign;

      assert(description.length <= 60, 'description');

      return {
        date: {
          day,
          month,
          year,
        },
        description,
        value,
      };
    }
  }

  function parseCheck(text: TextNode[]) {
    return (entry: TextNode[]) => {
      const match = /\d{4}/.exec(entry[0].value);
      assert(match != null, 'check check');

      const matchDate = /(\d\d)\/(\d\d)/.exec(entry[2].value);
      assert(matchDate != null, 'matchDate');

      const month = parseInt(matchDate[1]);
      const day = parseInt(matchDate[2]);

      const description = `Check #${entry[0].value}`;
      const value = Money.load(`$0${entry[1].value}`);
      value.cents = -value.cents;

      return {
        date: {
          day,
          month,
          year,
        },
        description,
        value,
      };
    }
  }

  let started = false;
  let mode: (entry: TextNode[]) => Omit<Transaction, 'accountId'> = n => { assert(false, 'fallback'); }
  const expected: string[] = [];
  const transactions = [];

  for (const page of pages) {
    const start = page.find(t => t.value == 'Activity Detail')
      ?? (started && page.find(t => t.value == 'Account Number:'));

    if (!start) continue;
    started = true;

    const entries = column(page, start.x).filter(t => t.y > start.y);

    for (let i = 0; i < entries.length; ++i) {
      const node = entries[i];
      const str = expected.pop();
      if (str) {
        assert(str == node.value, `expected ${node.value}`);
      } else if (node.value == 'Daily Balance Detail' || node.value.includes('continued on next page')) {
        break;
      } else {
        switch (node.value) {
          case 'Deposits and Other Additions':
            mode = parseDefault(page, 1);
            expected.push('Date');
            break;

          case 'Checks and Substitute Checks':
            mode = parseCheck(page);
            expected.push('number', 'Check');
            break;

          case 'Banking/Check Card Withdrawals and Purchases':
          case 'Banking/Debit Card Withdrawals and Purchases':
          case 'Online and Electronic Banking Deductions':
          case 'Other Deductions':
            mode = parseDefault(page, -1);
            expected.push('Date');
            break;

          default:
            const entry = row(page, node.y);
            const wrap = column(page, entry[entry.length - 1].x)
              .filter(t => t.y > node.y && (!entries[i + 1] || t.y < entries[i + 1].y))

            entry.push(...wrap);

            const transaction = mode(entry);
            transactions.push(transaction);
        }
      }
    }
  }

  const totalPositive = Money.load('$0' + headerPage![header + 10].value);
  const totalNegative = Money.load('$0' + headerPage![header + 11].value);
  const total = totalPositive.cents - totalNegative.cents;

  const check = transactions.reduce((total, t) => total + t.value.cents, 0);
  assert(total == check, `total check ${total} ${check}`);

  console.log(`  ${transactions.length} transactions`);

  return transactions;
}
