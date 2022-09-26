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

function parseBankStatementTotal(text: TextNode[], header: TextNode) {
  const top = text[text.indexOf(header) + 1];

  if (!/There (was|were) \d/.test(top.value))
    return null;

  const wrap = column(text, top.x).filter(t => t.y > top.y);

  let total = 0;

  for (const line of wrap) {
    const match = /(\$[,\d]+\.\d\d)\.$/.exec(line.value);

    if (match) {
      total += Money.load(match[1]).cents;
      const next = wrap[wrap.indexOf(line) + 1];
      if (!next || next.y - line.y > 1) {
        break;
      }
    }
  }

  return total;
}

interface ParseContext {
  transactions: Transaction[];
}

function parseBankStatement(context: ParseContext, document: Root, year: number) {
  const totals = {
    'Banking/Check Card Withdrawals and Purchases': null as null | number,
    'Online and Electronic Banking Deductions': null as null | number,
    'Deposits and Other Additions': null as null | number,
  };

  const transactions = [];
  for (const page of document.Pages) {
    const text = page.Texts.map(t => ({ ...t, value: decodeURIComponent(t.R[0].T) }));
    let y = 0;

    while (true) {
      const h1 = text.find(t => t.y > y && t.value in totals);
      if (!h1) break;
      y = h1.y;

      const entries = column(text, h1.x).filter(t => t.y > h1.y);
      assert(entries.shift()?.value == 'Date', `bank statement header`);

      const label = h1.value as keyof typeof totals;
      const total = parseBankStatementTotal(text, h1);

      if (typeof totals[label] == 'number') {
        assert(total == null, `bank statement duplicate total`);
      } else {
        assert(total != null, `bank statement missing total`);
        totals[label] = total;
      }

      for (const node of entries) {
        const match = /(\d\d)\/(\d\d)/.exec(node.value);
        if (!match) break;

        const data = row(text, node.y).filter(t => t.x > node.x);

        const month = parseInt(match[1]);
        const day = parseInt(match[2]);

        const description = data[1].value;
        const value = Money.load(`$0${data[0].value}`);

        if (h1.value != 'Deposits and Other Additions') {
          value.cents = -value.cents;
        }

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
  }

  let total = 0;
  for (const key in totals) {
    const value = totals[key as keyof typeof totals];
    if (!value) continue;

    if (key == 'Deposits and Other Additions') {
      total += value;
    } else {
      total -= value;
    }
  }

  const check = transactions.reduce((total, t) => total + t.value.cents, 0);
  assert(total == check, `total check ${total} ${check}`);
}

function parseCreditCardStatement(context: ParseContext, document: Root, year: number) {
  const page1 = document.Pages[0].Texts.map(t => ({ x: t.x, y: t.y, value: decodeURIComponent(t.R[0].T) }));
  const header = page1.findIndex(t => t.value == '+ Purchases');
  assert(header != -1 && page1[header].y == page1[header + 1].y, 'credit card statement header');

  const total = Money.load(page1[header + 1].value);

  const transactions = [];
  for (const page of document.Pages) {
    const text = page.Texts.map(t => ({ x: t.x, y: t.y, value: decodeURIComponent(t.R[0].T) }));

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

  const context = {
    transactions: [],
  };

  for (const [id, mode] of folders) {
    const rsp = await drive.files.list({
      q: `'${id}' in parents`,
    });

    for (const file of rsp.data.files!) {
      const stream = await drive.files.get({
        fileId: file.id!,
        alt: 'media',
        acknowledgeAbuse: true,
      }, {
        responseType: 'stream',
      });

      console.log(`load ${file.name}`);

      const buffer = await stream2buffer(stream.data);

      const match = /Statement_(\w+)_(\d+)_(\d+)\.pdf/.exec(file.name!);
      assert(match != null, 'match');

      const year = parseInt(match[3]);
      // const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(match[1]) + 1;

      const document = await parsePDF(buffer);

      mode(context, document, year);
    }
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
