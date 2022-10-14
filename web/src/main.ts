import { createApp, h } from 'vue'
import { framework } from '@mfro/vue-ui';

import App from './view/App.vue';
import type * as pdfjson from 'pdfjs-dist';

import { importPNC } from './import/pnc';
import { open, Collection, Transaction, Tag, MoneyContext } from './store';
import { Date, Money } from './common';

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
import { assert } from '@mfro/assert';

async function main() {
  const data = await open();

  Object.assign(window, {
    data,
    Collection,
  });

  const app = createApp({
    provide: { data },
    render: () => h(App),
  });

  app.config.unwrapInjectedRef = true;

  app.use(framework);

  app.mount('#app');

  await importPNC(data);

  {
    for (const account of data.accounts.array()) {
      const transactions = account.transactions.array();

      const total = transactions.reduce((sum, t) => sum + t.value.cents, 0);
      console.log(`${account.description}: ${Money.save({ cents: total })}`);

      const duplicates = transactions.filter(t => transactions.some(f => t != f && t.description == f.description && Date.eq(t.date, f.date) && t.value.cents == f.value.cents));
      if (duplicates.length > 0) {
        console.warn('duplicates', duplicates);
      }
    }

    for (const account of data.accounts.array()) {
      const mAccount = array(old.state.accounts).find(a => a.description == account.description);
      assert(mAccount != null, 'x');

      for (const t of account.transactions.array()) {
        const mTransaction = array(old.state.transactions).filter(f => t.description == f.description && Date.eq(t.date, f.date) && t.value.cents == f.value.cents);
        assert(mTransaction.length > 0, 'x');
        assert(mTransaction.every(t => JSON.stringify(t.tagIds) == JSON.stringify(mTransaction[0].tagIds)), 'x');

        for (const id of mTransaction[0].tagIds) {
          const src = (old.state.tags as any)[id];
          addTag(data, t, src);
        }
      }
    }

    console.log('done');
  }
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

  if ('parts' in t) {
    t.parts.get(0).tags.insert(tag);
  } else {
    t.tags.insert(tag);
  }
}

function array<T>(o: { nextId: number, '0': T }): T[] {
  return Object.keys(o)
    .filter(k => k != 'nextId')
    .map(k => (o as any)[k as any]);
}
