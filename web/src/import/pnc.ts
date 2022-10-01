import type * as pdfjson from 'pdfjs-dist';
import { assert } from '@mfro/assert';
import { Money, Transaction } from '@/common';

import { readDir, readFile } from './google-drive';

const pdfjs: typeof pdfjson = (window as any).pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.js';

function parseDebitStatement(pages: string[][], year: number) {
  const summaryPage = pages.find(p => p.includes('Balance Summary'));
  assert(summaryPage != null, 'pnc debit: no balance suppery');

  const summaryIndex = summaryPage.indexOf('Balance Summary');

  const totalPositive = Money.load('$0' + summaryPage[summaryIndex + 10]);
  const totalNegative = Money.load('$0' + summaryPage[summaryIndex + 11]);
  const total = totalPositive.cents - totalNegative.cents;

  const transactions: Transaction[] = [];

  console.log(`debit statement: ${Money.save({ cents: total })}`);

  const activityDetailIndex = pages.findIndex(p => p.includes('Activity Detail'));
  const activityDetail = pages.slice(activityDetailIndex).flat();

  let index = activityDetail.indexOf('Activity Detail') + 1;
  let parse: (entry: string[]) => void = () => assert(false, 'no mode');

  function parseDefault(sign: number) {
    while (activityDetail[index] != 'Description') {
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

        console.log(`${month}/${day} ${Money.save(value)} ${description}`);
        index = next_index;

        transactions.push({
          date: { day, month, year },
          value,
          description,
        });
      };
    }
  }

  function parseChecks() {
    while (activityDetail[index] != 'Reference') {
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
          date: { day, month, year },
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
    switch (line) {
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
        if (line.endsWith('continued on next page')) {
          while (activityDetail[index] != '- continued') {
            index += 1;
          }
          index += 1;
        } else {
          section.push(line);
        }

        index += 1;
    }
  }

  const check = transactions.reduce((check, t) => check + t.value.cents, 0);
  assert(check == total, 'statement check');

  return transactions;
}

function parseCreditStatement(pages: string[][], year: number) {
  const summaryPage = pages.find(p => p.includes('Balance Summary'));
  assert(summaryPage != null, 'pnc debit: no balance suppery');

  const summaryIndex = summaryPage.indexOf('Balance Summary');

  const totalPositive = Money.load('$0' + summaryPage[summaryIndex + 10]);
  const totalNegative = Money.load('$0' + summaryPage[summaryIndex + 11]);
  const total = totalPositive.cents - totalNegative.cents;
  let check = 0;

  const transactions: Transaction[] = [];

  console.log(`debit statement: ${Money.save({ cents: total })}`);

  const activityDetailIndex = pages.findIndex(p => p.includes('Activity Detail'));
  const activityDetail = pages.slice(activityDetailIndex).flat();

  let index = activityDetail.indexOf('Activity Detail') + 1;
  let parse: (entry: string[]) => void = () => assert(false, 'no mode');

  function parseDefault(sign: number) {
    while (activityDetail[index] != 'Description') {
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
        check += value.cents;

        const description = section.slice(index + 2, next_index).join(' ');

        console.log(`${month}/${day} ${Money.save(value)} ${description}`);
        index = next_index;

        transactions.push({
          date: { day, month, year },
          value,
          description,
        });
      };
    }
  }

  function parseChecks() {
    while (activityDetail[index] != 'Reference') {
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
          date: { day, month, year },
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
    switch (line) {
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
        if (line.endsWith('continued on next page')) {
          while (activityDetail[index] != '- continued') {
            index += 1;
          }
          index += 1;
        } else {
          section.push(line);
        }

        index += 1;
    }
  }

  assert(check == total, 'statement check');

  return transactions;
}

async function loadPDFText(raw: ArrayBuffer) {
  const pdf = await pdfjs.getDocument(raw).promise;

  const pageTasks = [];

  for (let i = 1; i <= pdf.numPages; ++i) {
    pageTasks.push(pdf.getPage(i).then(async page => {
      const opList = await page.getOperatorList();
      const text: string[] = [];

      for (let i = 0; i < opList.fnArray.length; ++i) {
        if (opList.fnArray[i] == pdfjs.OPS.showText) {
          const [chars] = opList.argsArray[i];
          const string = chars.map((ch: any) => ch.unicode).join('');
          text.push(string);
        }
      }

      return text;
    }));
  }

  return await Promise.all(pageTasks);
}

export async function importPNC() {
  for (const file of await readDir('185L3i1gzhqwTbKDdgBaoawwQRZjcl1Ir')) {
    const buffer = await readFile(file.id!);

    const match = /Statement_(\w+)_(\d+)_(\d+)\.pdf/.exec(file.name!);
    assert(match != null, 'match');

    const year = parseInt(match[3]);

    const pages = await loadPDFText(buffer);
    parseDebitStatement(pages, year);
  }

  for (const file of await readDir('185L3i1gzhqwTbKDdgBaoawwQRZjcl1Ir')) {
    const buffer = await readFile(file.id!);

    const match = /Statement_(\w+)_(\d+)_(\d+)\.pdf/.exec(file.name!);
    assert(match != null, 'match');

    const year = parseInt(match[3]);

    const pages = await loadPDFText(buffer);
    parseDebitStatement(pages, year);
  }
}
