import { assert } from '@mfro/assert';

export interface Date {
  day: number;
  month: number;
  year: number;
}

export namespace Date {
  export function load(raw: string): Date {
    const parts = raw.split('/');
    assert(parts.length == 3, `invalid date: ${raw}`);

    const month = parseInt(parts[0]);
    assert(month >= 1 && month <= 12, `invalid date: ${raw}`);

    const day = parseInt(parts[1]);
    assert(day >= 1 && day <= 31, `invalid date: ${raw}`);

    const year = parseInt(parts[2]);
    assert(year >= 1000 && year <= 9999, `invalid date: ${raw}`);

    return { day, month, year };
  }

  export function save(value: Date): string {
    let month = value.month.toString();
    let day = value.day.toString();
    let year = value.year.toString();

    month = '0'.repeat(2 - month.length) + month;
    day = '0'.repeat(2 - day.length) + day;

    return month + '/' + day + '/' + year;
  }

  export function eq(a: Date, b: Date) {
    return a.day == b.day
      && a.month == b.month
      && a.year == b.year;
  }

  export function lt(a: Date, b: Date) {
    if (a.year < b.year) return true;
    if (a.year > b.year) return false

    if (a.month < b.month) return true;
    if (a.month > b.month) return false

    if (a.day < b.day) return true;

    return false
  }
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
      return '';

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

// export interface Transaction {
//   date: Date;
//   description: string;
//   value: Money;
// }

// export namespace Transaction {
//   export function normalize(t: Transaction) {
//     if (/DEBIT CARD PURCHASE   XXXXX\d{4}/i.test(t.description)) {
//       if (/amazon|amzn/i.test(t.description))
//         return 'amazon';

//       return t.description.slice(31);
//     }

//     return t.description;
//   }

//   export function description(t: Transaction) {
//     const lower = t.description.toLowerCase();

//     if (lower.startsWith('debit card purchase')) {
//       let rest = lower.slice(20);
//       let parts = rest.split(' ').filter(a => a)
//       let details = parts[1];
//       let location = parts[parts.length - 2];
//       let state = parts[parts.length - 1];
//       let description = parts.slice(1, parts.length - 2).join(' ');
//       return `debit: ${description} (${location} ${state})`;
//     }

//     if (lower.startsWith('ach credit')) {
//       let rest = lower.slice(11);
//       return `ach credit: ${rest}`;
//     }

//     return lower;
//   }

//   export function eq(a: Transaction, b: Transaction) {
//     return Date.eq(a.date, b.date)
//       && a.description == b.description
//       && Money.eq(a.value, b.value)
//   }
// }
