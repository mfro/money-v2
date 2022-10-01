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
  const context = await open();

  const app = createApp({
    provide: { context },
    render: () => h(App),
  });

  app.config.unwrapInjectedRef = true;

  app.use(framework);

  app.mount('#app');

  Object.assign(window, { context });

  await importPNC(context);

  {
    for (const account of Collection.array(context.accounts)) {
      const transactions = Collection.array(context.transactions).filter(t => context.imports[t.importId].accountId == account.id);

      const total = transactions.reduce((sum, t) => sum + t.value.cents, 0);
      console.log(`${account.description}: ${Money.save({ cents: total })}`);

      const duplicates = transactions.filter(t => transactions.some(f => t != f && Date.eq(t.date, f.date) && t.value == f.value));
      if (duplicates.length > 0) {
        console.warn('duplicates', duplicates);
      }
    }
  }
}
