<template>
  <v-flex style="height: 100%; overflow: hidden;">
    <TagTable />

    <v-flex column
            style="flex: 3 1 0">

      <Chart style="flex: 1 1 0"
             type="by-tag" />
    </v-flex>
  </v-flex>
</template>

<script setup>
import Chart from '../../ui/Chart';
import FilterEditor from '@/ui/Filter/FilterEditor.vue';
import TagTable from '../../ui/TagTable.vue';

// const data = inject('data');

// const emit = defineEmits(['update:filter']);
// const props = defineProps({
//   filter: { type: Object, default: {} },
// });

// const context = UIContext.create(data, bindModel('filter'));
// provide('context', context);
</script>
