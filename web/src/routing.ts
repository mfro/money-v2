import { createRouter, createWebHashHistory, NavigationGuardNext, RouteLocation } from 'vue-router';

import { Filter } from './ui/filter';

import Tags from '@/view/Tags.vue';
import Transactions from '@/view/Transactions.vue';
import { withQuery } from './util';

function getFilter(route: RouteLocation) {
  let str = route.query['filter'];
  if (typeof str == 'string')
    return JSON.parse(str);

  return Filter.empty();
}

const filterMixin = {
  props(route: RouteLocation) {
    return {
      filter: getFilter(route),
    };
  },

  beforeEnter(to: RouteLocation, from: RouteLocation, next: NavigationGuardNext) {
    if (from.query['filter'] && !to.query['filter']) {
      next(withQuery(to, { filter: from.query['filter'] }));
    } else {
      next();
    }
  },
};

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/transactions' },
    {
      path: '/tags',
      component: Tags,
      ...filterMixin,
    },
    {
      path: '/transactions',
      component: Transactions,
      ...filterMixin,
    },
  ],
});
