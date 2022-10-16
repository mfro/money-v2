<template>
  <v-flex style="height: 100%; overflow: hidden;">
    <TransactionTable v-if="table"
                      style="flex: 3 1 0" />

    <v-flex v-if="chart"
            column
            style="flex: 4 1 0"
            :key="table + chart">

      <Chart type="by-month"
             style="flex: 1 1 0" />

      <Chart type="spectrum"
             style="flex: 1 1 0" />
    </v-flex>
  </v-flex>
</template>

<script setup>
import { routeQuery } from '@/util';

import Chart from '@/ui/Chart';
import TransactionTable from '@/ui/TransactionTable.vue';

const table = routeQuery('table', true);
const chart = routeQuery('chart', true);
</script>
