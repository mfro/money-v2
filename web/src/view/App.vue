<template>
  <v-app row
         class="root">
    <v-flex column
            class="mx-3"
            style="flex: 0 0 auto">

      <v-flex class="my-3"
              justify-space-around>
        <v-button v-for="info in nav"
                  @click="page = info.page"
                  :color="page == info.page ? 'primary' : 'default'">
          {{ info.label}}
        </v-button>
      </v-flex>

      <TagFilter class="mb-3" />
    </v-flex>

    <template v-if="page == 'tags'">
      <TagTable />

      <v-flex column>
        <Chart style="flex: 1 1 0"
               type="by-tag" />

        <!-- <Chart style="flex: 1 1 0"
               type="by-tag-unique" /> -->
      </v-flex>
    </template>

    <template v-if="page == 'transactions'">
      <TransactionTable />

      <v-flex column>
        <Chart style="flex: 1 1 0"
               type="by-month" />
      </v-flex>
    </template>
  </v-app>
</template>

<script setup>
import { inject, provide, shallowRef, toRef } from 'vue';

import { UIContext } from '@/ui/context';
import { Filter } from '@/ui/filter';

import Chart from './Chart';
import TagFilter from '@/ui/TagFilter.vue';
import TagTable from '../ui/TagTable.vue';
import TransactionTable from '../ui/TransactionTable.vue';

const data = inject('data');

const context = UIContext.create(data);
provide('context', context);

Filter.attachToUrl(toRef(context, 'filter'));

const page = shallowRef('transactions');

const nav = [
  { page: 'tags', label: 'Tags' },
  { page: 'transactions', label: 'Transactions' },
];
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
  background-color: white !important;
  display: grid !important;
  grid-template-rows: minmax(auto, 100vh);
  grid-template-columns: 20em 1fr 1fr;
}

.transactions {
  border-radius: 3px;
  display: grid;
  overflow: auto;
  grid-template-columns: repeat(4, auto);

  > .transaction {
    display: grid;
    grid-column: span 4;
    grid-template-columns: subgrid;
    padding: 2 * $unit;
    cursor: pointer;
    user-select: none;

    &:hover {
      background-color: #efefef;
    }

    &.active {
      background-color: $primary;
      color: white;
      font-weight: bold;
    }
  }
}

pre {
  white-space: pre;
  margin: 0;
}
</style>
