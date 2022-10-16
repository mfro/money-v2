<template>
  <v-app class="root">
    <v-flex class="toolbar px-2 pt-2">
      <router-link to="/tags"
                   custom
                   v-slot="{ isActive, navigate }">
        <v-button @click="navigate()"
                  :class="['mx-2', { isActive }]"
                  :color="isActive ? 'primary' : 'default'">Tags</v-button>
      </router-link>

      <router-link to="/transactions"
                   custom
                   v-slot="{ isActive, navigate }">
        <v-button @click="navigate()"
                  :class="['mx-2', { isActive }]"
                  :color="isActive ? 'primary' : 'default'">Transactions
        </v-button>
      </router-link>
    </v-flex>

    <div class="content">
      <router-view @update:filter="f => updateFilter(f)" />
    </div>
  </v-app>
</template>

<script setup>
import { inject, provide, toRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { UIContext } from '@/ui/context';
import { Filter } from '@/ui/filter';

// const data = inject('data');

// const context = UIContext.create(data);
// provide('context', context);

// Filter.attachToUrl(toRef(context, 'filter'));

const route = useRoute();
const router = useRouter();

function updateFilter(f) {
  router.replace({
    ...route,
    query: { ...route.query, filter: JSON.stringify(f) },
  })
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
  max-height: 100vh;
  overflow: hidden;
  // display: grid !important;
  // grid-template-rows: minmax(auto, 100vh);
  // grid-template-columns: 20em 1fr 1fr;
}

.content {
  flex: 0 0 1;
  overflow: hidden;
  background-color: white;
  z-index: 1;
}

.toolbar {
  .v-button {
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
    box-shadow: none !important;
    background-color: #ddd !important;

    &.isActive {
      color: $primary !important;
      box-shadow: 0 0 8px rgba(61, 56, 56, 0.25) !important;
      background-color: white !important;
    }
  }
}
</style>
