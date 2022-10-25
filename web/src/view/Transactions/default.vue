<template>
  <v-flex style="height: 100%; overflow: hidden;">
    <TransactionTable v-if="table"
                      style="flex: 3 1 0" />

    <v-flex v-if="chart"
            column
            style="flex: 4 1 0;  overflow: auto"
            :key="table + chart">

      <Chart type="by-month"
             style="flex: 0 0 auto" />

      <Chart type="spectrum"
             style="flex: 0 0 auto" />
    </v-flex>
  </v-flex>
</template>

<script setup>
import { defaultRef, routeQueryRef } from '@/util';

import Chart from '@/ui/Chart';
import TransactionTable from '@/ui/TransactionTable.vue';

const table = defaultRef(routeQueryRef('table'), true);
const chart = defaultRef(routeQueryRef('chart'), true);
</script>
