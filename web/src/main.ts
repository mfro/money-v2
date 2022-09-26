import 'ress';
import 'dominion.core';

import { createApp, h } from 'vue'
import { framework } from '@mfro/vue-ui';

import App from './view/App.vue';

const app = createApp({
  render: () => h(App),
});

app.config.unwrapInjectedRef = true;

app.use(framework);

app.mount('#app');

declare global {
  function require(name: string): any;
}
