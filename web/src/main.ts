import { createApp, h } from 'vue'
import { framework } from '@mfro/vue-ui';

import App from './view/App.vue';
import type * as pdfjson from 'pdfjs-dist';

import { importPNC } from './import/pnc';
import { open, Collection } from './store';
import { Date, Money } from './common';

const pdfjs: typeof pdfjson = (window as any).pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.js';

main();

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
      const transactions = data.transactions.array().filter(t => data.imports.get(t.importId).accountId == account.id);

      const total = transactions.reduce((sum, t) => sum + t.value.cents, 0);
      console.log(`${account.description}: ${Money.save({ cents: total })}`);

      const duplicates = transactions.filter(t => transactions.some(f => t != f && Date.eq(t.date, f.date) && t.value == f.value));
      if (duplicates.length > 0) {
        console.warn('duplicates', duplicates);
      }
    }
  }
}
