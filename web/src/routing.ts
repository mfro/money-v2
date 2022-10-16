import { createRouter, createWebHashHistory, RouteLocation } from 'vue-router';

import { Filter } from './ui/filter';

import Tags_default from '@/view/Tags/default.vue';
import Tags_sidebar from '@/view/Tags/sidebar.vue';
import Transactions_default from '@/view/Transactions/default.vue';
import Transactions_sidebar from '@/view/Transactions/sidebar.vue';

// function getFilter(route: RouteLocation) {
//   const str = route.query['filter']
//     || localStorage.getItem('mfro:money:filter');

//   if (typeof str == 'string') {
//     return JSON.parse(str);
//   } else {
//     return Filter.empty();
//   }
// }

// function getSaved(route: RouteLocation, name: string) {
//   const str = route.query[name]
//     || localStorage.getItem(`mfro:money:${route.path}:${name}`);

//   if (typeof str == 'string') {
//     return JSON.parse(str);
//   } else {
//     return undefined
//   }
// }

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
  ],
});
