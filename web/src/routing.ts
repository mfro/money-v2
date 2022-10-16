import { createRouter, createWebHashHistory } from 'vue-router';

import Tags_default from '@/view/Tags/default.vue';
import Tags_sidebar from '@/view/Tags/sidebar.vue';
import Transactions_default from '@/view/Transactions/default.vue';
import Transactions_sidebar from '@/view/Transactions/sidebar.vue';
import Labeling_default from '@/view/Labeling/default.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/transactions' },
    {
      path: '/tags',
      components: {
        default: Tags_default,
        sidebar: Tags_sidebar,
      },
    },
    {
      path: '/transactions',
      components: {
        default: Transactions_default,
        sidebar: Transactions_sidebar,
      },
    },
    {
      path: '/labeling',
      components: {
        default: Labeling_default,
      },
    },
  ],
});
