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
import TagTable from '../../ui/TagTable.vue';
</script>
