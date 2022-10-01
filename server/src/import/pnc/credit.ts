import { PDF } from 'pdf2json';
import { assert } from '@mfro/ts-common/assert';
import { Money } from '@/common';

export function parsePNCCreditStatement(document: PDF, year: number) {
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

      transactions.push({
        date: {
          day,
          month,
          year,
        },
        description,
        value,
      });
    }
  }

  const check = transactions.reduce((total, t) => total + t.value.cents, 0);
  assert(-total.cents == check, `total check ${total.cents} ${check}`);

  console.log(`  ${transactions.length} transactions`);

  return transactions;
}
