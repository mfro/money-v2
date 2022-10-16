<template>
  <v-flex column
          style="flex: 1 1 0; overflow: hidden;">

    <v-text-field :model-value="context.filter.search"
                  @update:model-value="v => context.filter = { ...context.filter, search: v }"
                  solo
                  class="ma-3"
                  style="flex: 0 0 auto" />

    <TagFilter class="mb-3" />
  </v-flex>
</template>

<script setup>
import { inject } from 'vue';

import TagFilter from './TagFilterEditor.vue';

const context = inject('context');
</script>
