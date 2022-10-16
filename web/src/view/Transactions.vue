<template>
  <v-flex style="height: 100%; overflow: hidden;">
    <v-flex column
            class="mr-3"
            style="flex: 0 0 18em">
      <TagFilter />
    </v-flex>

    <TransactionTable />

    <v-flex column
            style="flex: 1 1 0">
      <Chart type="by-month"
             style="flex: 1 1 0" />
    </v-flex>
  </v-flex>
</template>

<script setup>
import { computed, inject, provide } from 'vue';

import { UIContext } from '@/ui/context';

import Chart from '../ui/Chart';
import TagFilter from '@/ui/TagFilter.vue';
import TransactionTable from '../ui/TransactionTable.vue';

const data = inject('data');

const emit = defineEmits(['update:filter']);
const props = defineProps({
  filter: Object,
});

const context = UIContext.create(data, computed({
  get: () => props.filter ?? {},
  set: v => emit('update:filter', v),
}));

provide('context', context);

// context.filter = computed({
//   get: () => props.filter ?? {},
//   set: v => emit('update:filter', v),
// });
</script>
