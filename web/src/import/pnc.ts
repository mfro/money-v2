import { assert } from '@mfro/assert';
import { Money } from '@/common';
import { Collection, MoneyContext } from '@/store';

import { readDir, readFile } from './google-drive';
import { parsePDF, Text } from './pdf';

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
    console.log(page);
  }

  const activityDetailIndex = pages.findIndex(p => p.some(t => t.value == 'Activity Detail'));
  const activityDetail = pages.slice(activityDetailIndex).flat();

  let index = activityDetail.findIndex(t => t.value == 'Activity Detail') + 1;
  let parse: (entry: string[]) => void = () => assert(false, 'no mode');

  function parseDefault(sign: number) {
    while (activityDetail[index].value != 'Description') {
      index += 1;
    }
    index += 1

    parse = (section) => {
      let index = 0;
      while (index < section.length) {
        let next_index = section.slice(index + 1).findIndex(line => /^(\d\d)\/(\d\d)$/.test(line));
        if (next_index == -1) next_index = section.length;
        else next_index += index + 1;

        const match = /^(\d\d)\/(\d\d)$/.exec(section[index]);
        assert(match != null, 'default parse');

        const month = parseInt(match[1]);
        const day = parseInt(match[2]);

        const value = Money.load(`$0${section[index + 1]}`);
        value.cents *= sign;

        const description = section.slice(index + 2, next_index).join(' ');
        assert(next_index - index <= 4, 'description');

        console.log(`    ${month}/${day} ${Money.save(value)} ${description}`);
        index = next_index;

        transactions.push({
          date: { day, month },
          value,
          description,
        });
      };
    }
  }

  function parseChecks() {
    while (activityDetail[index].value != 'Reference') {
      index += 1;
    }
    index += 2;

    parse = (section) => {
      for (let i = 0; i + 3 < section.length; i += 4) {
        const match = /\d{4}/.exec(section[i + 0]);
        assert(match != null, 'check check');

        const matchDate = /(\d\d)\/(\d\d)/.exec(section[i + 2]);
        assert(matchDate != null, 'matchDate');

        const month = parseInt(matchDate[1]);
        const day = parseInt(matchDate[2]);

        const description = `Check #${section[i + 0]}`;
        const value = Money.load(`$0${section[i + 1]}`);
        value.cents = -value.cents;

        transactions.push({
          date: { day, month },
          value,
          description,
        });
      }
    }
  }

  function flush() {
    if (section.length > 0) {
      parse(section);
      section.length = 0;
    }
  }

  const section: string[] = [];

  loop:
  while (index < activityDetail.length) {
    const line = activityDetail[index];
    switch (line.value) {
      case 'Deposits and Other Additions':
        flush();
        parseDefault(+1);
        break;

      case 'Banking/Check Card Withdrawals and Purchases':
      case 'Banking/Debit Card Withdrawals and Purchases':
      case 'Online and Electronic Banking Deductions':
      case 'Other Deductions':
        flush();
        parseDefault(-1);
        break;

      case 'Checks and Substitute Checks':
        flush();
        parseChecks();
        break;

      case 'Daily Balance Detail':
        flush();
        break loop;

      default:
        if (/continued on next page$/.test(line.value) || /^Page \d of $/.test(line.value)) {
          while (activityDetail[index].value != '- continued') {
            index += 1;
          }
          index += 1;
        } else {
          section.push(line.value);
        }

        index += 1;
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

      const description = `Check #${column[index + 2].value}`;

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

async function importAccount(context: MoneyContext, description: string, directoryId: string, parse: (pages: Text[][]) => ParsedTransaction[]) {
  const account = Collection.array(context.accounts).find(a => a.description == description)
    || Collection.insert(context.accounts, { description });

  console.log(`importing account ${account.description}`);

  for (const file of await readDir(directoryId)) {
    const existing = Collection.array(context.imports).find(i => i.accountId == account.id && i.key == file.name);
    if (existing) continue;

    console.log(`  importing statement ${file.name}`);

    const match = /Statement_(\w+)_(\d+)_(\d+)\.pdf/.exec(file.name!);
    assert(match != null, 'match');

    const year = parseInt(match[3]);

    const buffer = await readFile(file.id!);
    const pages = await parsePDF(buffer);
    const transactions = parse(pages);

    const import_ = Collection.insert(context.imports, {
      accountId: account.id,
      description: `PDF statement ${file.name}`,
      key: file.name,
    });

    for (const t of transactions) {
      Collection.insert(context.transactions, {
        importId: import_.id,
        labelId: null,
        date: { ...t.date, year },
        description: t.description,
        value: t.value,
      });
    }
  }
}

export async function importPNC(context: MoneyContext) {
  await importAccount(context, 'PNC Virtual Wallet Debit', '185L3i1gzhqwTbKDdgBaoawwQRZjcl1Ir', parseDebitStatement);
  await importAccount(context, 'PNC Cash Rewards Visa Signature', '1j0Psbc39iudkTpNIBHKahPCXGzs1WD_A', parseCreditStatement);
}
