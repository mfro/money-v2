import { createRouter, createWebHashHistory } from 'vue-router';

import Tags from '@/view/Tags.vue';
import Transactions from '@/view/Transactions.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/transactions' },
    {
      path: '/tags',
      component: Tags,
      props(route) {
        return {
          filter: JSON.parse(route.query['filter'] as string ?? '{}'),
        };
      },
    },
    {
      path: '/transactions',
      component: Transactions,

      props(route) {
        return {
          filter: JSON.parse(route.query['filter'] as string ?? '{}'),
        };
      },
    },
  ],
});
