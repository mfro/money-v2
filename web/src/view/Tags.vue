<template>
  <v-flex style="height: 100%; overflow: hidden;">
    <v-flex column
            class="mr-3"
            style="flex: 0 0 18em">

      <TagFilter class="mb-3" />
    </v-flex>

    <TagTable />

    <v-flex column
            style="flex: 3 1 0">
      <Chart style="flex: 1 1 0"
             type="by-tag" />

      <Chart style="flex: 1 1 0"
               type="by-tag-unique" />
    </v-flex>
  </v-flex>
</template>

<script setup>
import { computed, inject, provide } from 'vue';

import { UIContext } from '@/ui/context';

import Chart from '../ui/Chart';
import TagFilter from '@/ui/TagFilter.vue';
import TagTable from '../ui/TagTable.vue';

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
</script>
