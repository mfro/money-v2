import { createApp, h, watch } from 'vue'
import { framework } from '@mfro/vue-ui';
import { assert } from '@mfro/assert';

import App from './view/App.vue';
import type * as pdfjson from 'pdfjs-dist';

import { open, Collection, makeRef, MoneyContext, Tag, Transaction } from './store';
import { router } from './routing';

const pdfjs: typeof pdfjson = (window as any).pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.js';

main();

// async function test() {
//   const { data, id } = await join_new('wss://api.mfro.me/sync');

//   const state = data as any;
//   state.x = { a: 3, b: Collection.create() };

//   debugger;

//   console.log(JSON.stringify(state))
// }

import old from './old.json';
import { Date as Date2, Money } from './common';

async function main() {
  const { data, id } = await open();

  Object.assign(window, {
    data,
    Map,
    Collection,
  });

  // await fetch('http://localhost:8081/initialize', {
  //   method: 'POST',
  //   body: JSON.stringify({ id }),
  //   headers: {
  //     'content-type': 'application/json',
  //   },
  // });

  const app = createApp({
    provide: { data },
    render: () => h(App),
  });

  app.config.unwrapInjectedRef = true;

  app.use(router);
  app.use(framework);

  app.mount('#app');

  // await importPNC(data);

  // {
  //   for (const account of data.accounts) {
  //     const transactions = account.statements.array().flatMap(i => i.transactions.array());
  //     const total = transactions.reduce((sum, t) => sum + t.value.cents, 0);
  //     console.log(`${account.description}: ${Money.save({ cents: total })}`);

  //     const duplicates = transactions.filter(t => transactions.some(f => t != f && t.description == f.description && Date.eq(t.date, f.date) && t.value.cents == f.value.cents));
  //     if (duplicates.length > 0) {
  //       console.warn('duplicates', duplicates);
  //     }
  //   }

  for (const account of data.accounts) {
    const mAccount = array(old.state.accounts).find(a => a.description == account.description);
    assert(mAccount != null, 'x');

    const transactions = account.statements.array().flatMap(i => i.transactions.array());

    for (const t of transactions) {
      let mTransaction = array(old.state.transactions).filter(f => t.description == f.description && Date2.eq(t.date, f.date) && Money.eq(t.value, f.value));
      // if (mTransaction.length == 0) {
      //   mTransaction = array(old.state.transactions).filter(f => Date2.eq(t.date, f.date) && Money.eq(t.value, f.value));
      // }

      let transaction = data.transactions.array().find(x => x.source.type == 'pnc' && x.source.source == t);
      if (!transaction) {
        transaction = data.transactions.insert({
          source: { type: 'pnc', source: makeRef(t) },
          date: { ...t.date },
          value: { ...t.value },
          label: t.description,
          tags: Collection.create(),
        });
      }

      assert(mTransaction.length > 0, 'x');
      assert(mTransaction.every(t => JSON.stringify(t.tagIds) == JSON.stringify(mTransaction[0].tagIds)), 'x');

      for (const id of mTransaction[0].tagIds) {
        const src = (old.state.tags as any)[id];
        addTag(data, transaction, src);
      }
    }
    // } else {
    //   const mTransaction = array(old.state.transactions).filter(f => Date2.eq(date, f.date) && -t.amount * 100 == f.value.cents);
    //   console.log(t.date, t.name, t, mTransaction);
    // }
  }

  console.log('done');
  // }
}

function addTag(data: MoneyContext, t: Tag | Transaction, src: typeof old.state.tags[2]) {
  let tag = data.tags.array().find(t => t.name == src.name);
  if (!tag) {
    tag = data.tags.insert({
      name: src.name,
      tags: Collection.create(),
    });

    for (const id of src.tagIds) {
      const src = (old.state.tags as any)[id];
      addTag(data, tag, src);
    }
  }

  t.tags.insertRef(tag);
}

function array<T>(o: { nextId: number, '0': T }): T[] {
  return Object.keys(o)
    .filter(k => k != 'nextId')
    .map(k => (o as any)[k as any]);
}
