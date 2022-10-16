<template>
  <v-flex column
          grow>
    <v-flex class="mx-3">
      <v-button icon
                :color="table ? 'primary' : 'default'"
                @click="table = !table">
        <v-icon>view_list</v-icon>
      </v-button>

      <div class="ml-3" />

      <v-button icon
                :color="chart ? 'primary' : 'default'"
                @click="chart = !chart">
        <v-icon>leaderboard</v-icon>
      </v-button>
    </v-flex>

    <FilterEditor />
  </v-flex>
</template>

<script setup>
import { routeQuery } from '@/util';

import FilterEditor from '@/ui/Filter/FilterEditor.vue';

const table = routeQuery('table', true);
const chart = routeQuery('chart', true);
</script>
