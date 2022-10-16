import { assert } from '@mfro/assert';
import { Date, Money } from '@/common';
import { Collection, MoneyContext } from '@/store';

import { readDir, readFile } from './google-drive';
import { parsePDF, Text } from './pdf';

const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface PNCAccount {
  description: string;
  statements: Collection<PNCStatement>;
}

export interface PNCStatement {
  transactions: Collection<PNCTransaction>;

  description: string;
  key: string;
}

export interface PNCTransaction {
  date: Date;
  value: Money;
  description: string;
}

interface ParsedTransaction {
  date: { day: number, month: number };
  value: Money;
  description: string;
}

function parseDebitStatement(pages: Text[][]) {
  const summaryPage = pages.find(p => p.some(t => t.value == 'Balance Summary'));
  assert(summaryPage != null, 'pnc debit: no balance suppery');

  const summaryIndex = summaryPage.findIndex(t => t.value == 'Balance Summary');

  const totalPositive = Money.load('$0' + summaryPage[summaryIndex + 10].value);
  const totalNegative = Money.load('$0' + summaryPage[summaryIndex + 11].value);
  const total = totalPositive.cents - totalNegative.cents;

  const transactions: ParsedTransaction[] = [];

  for (const page of pages) {
    const column = page.filter(t => t.x < 380 && t.y > 101 && t.y < 800);
    column.sort((a, b) => (a.y - b.y) || (a.x - b.x));

    // console.log(column);

    let index = 0;
    let parse = () => { index += 1; };

    loop:
    while (index < column.length) {
      switch (column[index].value) {
        case 'Deposits and Other Additions':
          parseDefault(+1);
          break;

        case 'Banking/Check Card Withdrawals and Purchases':
        case 'Banking/Debit Card Withdrawals and Purchases':
        case 'Online and Electronic Banking Deductions':
        case 'Other Deductions':
          parseDefault(-1);
          break;

        case 'Checks and Substitute Checks':
          parseChecks();
          break;

        case 'Daily Balance Detail':
          break loop;

        default:
          parse();
      }
    }

    function parseDefault(sign: number) {
      index += 1;
      if (column[index].value == '\t- continued') index += 1;

      assert(column[index++].value == 'Date', 'debit statement default');
      assert(column[index++].value == 'Amount', 'debit statement default');
      assert(column[index++].value == 'Description', 'debit statement default');

      parse = () => {
        const o = column[index];

        const match = /^(\d\d)\/(\d\d)$/.exec(column[index++].value);
        assert(match != null, 'default parse');

        const month = parseInt(match[1]);
        assert(month >= 1 && month <= 12, 'invalid month');

        const day = parseInt(match[2]);
        assert(day >= 1 && day <= 31, 'invalid day');

        const value = Money.load(`$0${column[index++].value}`);
        value.cents *= sign;

        const descriptionLines = [];
        while (index < column.length && column[index].x != o.x) {
          descriptionLines.push(column[index++].value);
        }

        const description = descriptionLines.join(' ');
        assert(description.length > 0 && description.length <= 60, 'invalid description');

        transactions.push({
          date: { day, month },
          value,
          description,
        });
      };
    }

    function parseChecks() {
      index += 1;

      assert(column[index++].value == 'Check', 'debit statement check');
      assert(column[index++].value == '', 'debit statement check');
      assert(column[index++].value == 'Date', 'debit statement check');
      assert(column[index++].value == 'Reference', 'debit statement check');
      assert(column[index++].value == 'number', 'debit statement check');
      assert(column[index++].value == 'Amount', 'debit statement check');
      assert(column[index++].value == 'paid', 'debit statement check');
      assert(column[index++].value == 'number', 'debit statement check');

      parse = () => {
        const match = /^\d{4}$/.exec(column[index++].value);
        assert(match != null, 'check check');

        const value = Money.load(`$0${column[index++].value}`);
        value.cents = -value.cents;

        const matchDate = /^(\d\d)\/(\d\d)$/.exec(column[index++].value);
        assert(matchDate != null, 'matchDate');

        const month = parseInt(matchDate[1]);
        assert(month >= 1 && month <= 12, 'invalid month');

        const day = parseInt(matchDate[2]);
        assert(day >= 1 && day <= 31, 'invalid day');

        const description = `Check #${match[0]}`;

        const _referenceNumber = column[index++].value;

        transactions.push({
          date: { day, month },
          value,
          description,
        });
      };
    }
  }

  const check = transactions.reduce((check, t) => check + t.value.cents, 0);
  assert(check == total, 'statement check');

  return transactions;
}

function parseCreditStatement(pages: Text[][]) {
  assert(pages.length == 4, 'credit statement');

  let total = 0;

  for (const label of ['- Total payments received', '- Credits']) {
    const index = pages[0].findIndex(t => t.value == label);
    assert(index != -1, 'credits statement total');

    total += Money.load(pages[0][index + 1].value).cents;
  }

  for (const label of ['+ Purchases', '+ Cash advances', '+ Fees charged', '+ Interest charged']) {
    const index = pages[0].findIndex(t => t.value == label);
    assert(index != -1, 'credits statement total');

    total -= Money.load(pages[0][index + 1].value).cents;
  }

  const transactions: ParsedTransaction[] = [];
  for (const page of pages.slice(1)) {
    const column = page.filter(t => t.x < 400);
    column.sort((a, b) => (a.y - b.y) || (a.x - b.x));

    let index = column.findIndex(t => t.value == 'Amount') + 1;

    for (; index < column.length; index += 4) {
      const matchDate = /(\d\d)\/(\d\d)/.exec(column[index].value);
      if (!matchDate) break;

      const month = parseInt(matchDate[1]);
      const day = parseInt(matchDate[2]);

      const description = column[index + 2].value;

      const raw = column[index + 3].value;

      let value;
      if (raw.endsWith('-')) {
        value = Money.load(raw.slice(0, -1));
      } else {
        value = Money.load(raw);
        value.cents *= -1;
      }

      transactions.push({
        date: { day, month },
        value,
        description,
      });
    }
  }

  const check = transactions.reduce((check, t) => check + t.value.cents, 0);
  assert(check == total, 'statement check');

  return transactions;
}

async function importAccount(data: MoneyContext, description: string, directoryId: string, parse: (pages: Text[][]) => ParsedTransaction[]) {
  const account = data.accounts.array().find(a => a.description == description)
    || data.accounts.insert({ type: 'pnc', description, statements: Collection.create() });

  console.log(`importing account ${account.description}`);

  for (const file of await readDir(directoryId)) {
    const existing = account.statements.array().find(i => i.key == file.name);
    if (existing) continue;

    console.log(`  importing statement ${file.name}`);

    const match = /Statement_(\w+)_(\d+)_(\d+)\.pdf/.exec(file.name!);
    assert(match != null, 'match');

    const statementYear = parseInt(match[3]);
    const statementMonth = months.indexOf(match[1]);
    assert(statementMonth > 0, 'invalid statementh month');

    const buffer = await readFile(file.id!);
    const pages = await parsePDF(buffer);
    const transactions = parse(pages);

    const statement = account.statements.insert({
      transactions: Collection.create(),
      description: `PDF statement ${file.name}`,
      key: file.name!,
    });

    for (const t of transactions) {
      // if (t.date.month != statementMonth) debugger;
      const year = statementMonth == 1 && t.date.month == 12
        ? statementYear - 1 : statementYear;

      statement.transactions.insert({
        date: { ...t.date, year },
        description: t.description,
        value: t.value,
      });
    }
  }
}

export async function importPNC(data: MoneyContext) {
  await importAccount(data, 'PNC Virtual Wallet Debit', '185L3i1gzhqwTbKDdgBaoawwQRZjcl1Ir', parseDebitStatement);
  await importAccount(data, 'PNC Cash Rewards Visa Signature', '1j0Psbc39iudkTpNIBHKahPCXGzs1WD_A', parseCreditStatement);
}
