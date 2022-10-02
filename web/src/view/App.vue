<template>
  <v-app class="root">
    <pre class="pa-3">{{ JSON.stringify(context, null, '  ') }}</pre>
  </v-app>
</template>

<script setup>
import { inject } from 'vue';

const context = inject('context');
</script>

<style>
#app {
  width: 100vw;
  height: 100vh;
}
</style>

<style scoped lang="scss">
pre {
  white-space: pre;
  margin: 0;
}
</style>
