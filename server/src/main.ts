import * as fs from 'fs/promises';
import PDFParser, { Root } from 'pdf2json';
import { authenticate } from '@google-cloud/local-auth';
import { AuthClient } from 'google-auth-library';
import { google } from 'googleapis';

import { assert } from '@mfro/ts-common/assert';

import { Money, Transaction } from './common';
import { Readable } from 'stream';

const keyfilePath = './client-secret.json';
const credentialsPath = './credentials.json';

main();

async function loadCredentials() {
  try {
    const content = await fs.readFile(credentialsPath, 'utf8');
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function saveCredentials(client: AuthClient) {
  const content = await fs.readFile(keyfilePath, 'utf8');
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });

  await fs.writeFile(credentialsPath, payload);
}

async function getNewCredentials() {
  const auth = await authenticate({
    keyfilePath,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });

  await saveCredentials(auth);

  return auth;
}

async function parsePDF(src: Buffer) {
  return new Promise<Root>(resolve => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataReady", data => {
      resolve(data);
    });

    parser.parseBuffer(src);
  });
}

interface TextNode {
  x: number;
  y: number;
  value: string;
}

function row(text: TextNode[], y: number) {
  return text.filter(t => t.y == y)
    .sort((a, b) => a.x - b.x);
}

function column(text: TextNode[], x: number) {
  return text.filter(t => t.x == x)
    .sort((a, b) => a.y - b.y);
}

interface ParseContext {
  transactions: Transaction[];
}

function parseBankStatement(context: ParseContext, document: Root, year: number) {
  const pages: TextNode[][] = document.Pages.map(p => p.Texts.map(t => ({ ...t, value: decodeURIComponent(t.R[0].T) })));

  const headerPage = pages.find(p => p.some(t => t.value == 'Balance Summary'));
  const header = headerPage!.findIndex(t => t.value == 'Balance Summary');
  assert(header != -1, 'bank statement header');

  function parseDefault(text: TextNode[], sign: number) {
    return (entry: TextNode[]): Transaction => {
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
    return (entry: TextNode[]): Transaction => {
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
  let mode: (entry: TextNode[]) => Transaction = n => { assert(false, 'fallback'); }
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

            context.transactions.push(transaction);
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
}

function parseCreditCardStatement(context: ParseContext, document: Root, year: number) {
  const page1 = document.Pages[0].Texts.map(t => ({ ...t, value: decodeURIComponent(t.R[0].T) }));
  const header = page1.findIndex(t => t.value == '+ Purchases');
  assert(header != -1 && page1[header].y == page1[header + 1].y, 'credit card statement header');

  const total = Money.load(page1[header + 1].value);

  const transactions = [];
  for (const page of document.Pages) {
    const text = page.Texts.map(t => ({ ...t, value: decodeURIComponent(t.R[0].T) }));

    const h1a = text.find(t => t.value == 'Transaction');
    const h1b = text.find(t => t.x == h1a?.x && t.value == 'date');

    if (!h1a || !h1b)
      continue;

    for (const date of text.filter(t => t.x == h1a.x && t.y > h1b.y)) {
      const match = /(\d\d)\/(\d\d)/.exec(date.value);
      if (!match) break

      const row = text.filter(n => n.y == date.y);

      const month = parseInt(match[1]);
      const day = parseInt(match[2]);

      const description = row[2].value;
      const raw = row[3].value;

      if (raw.endsWith('-'))
        continue;

      const value = Money.load(raw);
      value.cents = -value.cents;

      const t = {
        date: {
          day,
          month,
          year,
        },
        description,
        value,
      };

      context.transactions.push(t);
      transactions.push(t);
    }
  }

  const check = transactions.reduce((total, t) => total + t.value.cents, 0);
  assert(-total.cents == check, `total check ${total.cents} ${check}`);

  console.log(`  ${transactions.length} transactions`);
}

async function main() {
  const auth = await loadCredentials() ?? await getNewCredentials();

  google.options({
    auth,
  });

  const drive = google.drive('v3');

  const folders = [
    ['1j0Psbc39iudkTpNIBHKahPCXGzs1WD_A', parseCreditCardStatement],
    ['185L3i1gzhqwTbKDdgBaoawwQRZjcl1Ir', parseBankStatement],
  ] as const;

  const context: ParseContext = {
    transactions: [],
  };

  for (const [id, mode] of folders) {
    const rsp = await drive.files.list({
      q: `'${id}' in parents`,
    });

    for (const file of rsp.data.files!) {
      let buffer;

      try {
        buffer = await fs.readFile(`cache/${file.id}`);
      } catch (e) {
        const stream = await drive.files.get({
          fileId: file.id!,
          alt: 'media',
          acknowledgeAbuse: true,
        }, {
          responseType: 'stream',
        });

        buffer = await stream2buffer(stream.data);
        await fs.writeFile(`cache/${file.id}`, buffer);
      }

      console.log(`load ${file.name}`);

      const match = /Statement_(\w+)_(\d+)_(\d+)\.pdf/.exec(file.name!);
      assert(match != null, 'match');

      const year = parseInt(match[3]);

      const document = await parsePDF(buffer);

      mode(context, document, year);
    }
  }

  const descriptions = new Set(context.transactions.map(t => t.description));
  console.log(context.transactions.length);
  console.log(descriptions.size);
  for (const description of descriptions) {
    console.log(description);
  }
}

async function stream2buffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', err => reject(`error converting stream - ${err}`));
  });
}
