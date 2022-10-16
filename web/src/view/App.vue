<template>
  <v-app row
         class="root">
    <v-flex column
            style="flex: 0 0 18em; overflow: hidden;">
      <v-flex class="mt-3">
        <template v-for="route in routes">
          <v-button icon
                    @click="navigate(route)"
                    :class="['ml-3', { isActive: $route.path == route.path }]">
            <v-icon>{{route.icon}}</v-icon>
          </v-button>
        </template>
      </v-flex>

      <router-view name="sidebar" />
    </v-flex>

    <div class="content">
      <router-view />
    </div>
  </v-app>
</template>

<script setup>
import { inject, provide } from 'vue';
import { useRouter } from 'vue-router';

import { UIContext } from '@/ui/context';
import { routeQuery } from '@/util';

const data = inject('data');
const router = useRouter();

const context = UIContext.create(data, routeQuery('filter', {}));
provide('context', context);

const routes = [
  {
    path: '/tags',
    icon: 'sell',
    filter: true,
  },
  {
    path: '/transactions',
    icon: 'receipt',
    filter: true,
  },
  {
    path: '/labeling',
    icon: 'edit',
  },
]

function navigate(info) {
  const route = {
    path: info.path,
  };

  if (info.filter) {
    route.query = {
      filter: JSON.stringify(context.filter),
    };
  }

  router.push(route);
}
</script>

<style>
#app {
  width: 100vw;
  height: 100vh;
}
</style>

<style scoped lang="scss">
@import "@mfro/vue-ui/src/style.scss";

.root {
  max-width: 100vw;
  max-height: 100vh;
  overflow: hidden;
  background-color: white !important;
}

.content {
  flex: 1 1 0;
  overflow: hidden;
  z-index: 1;
}

.v-button {
  // border-bottom-left-radius: 0 !important;
  // border-bottom-right-radius: 0 !important;
  // box-shadow: none !important;
  // background-color: #ddd !important;

  &.isActive {
    color: $primary !important;
    // box-shadow: 0 0 8px rgba(61, 56, 56, 0.25) !important;
    // background-color: white !important;
  }
}
</style>
