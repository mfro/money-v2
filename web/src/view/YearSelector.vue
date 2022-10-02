<template>
  <v-select :options="years"
            :model-value="modelValue"
            @update:model-value="y => emit('update:modelValue', y)" />
</template>

<script setup>
const emit = defineEmits('update:modelValue');
const props = defineProps({
  modelValue: {},
});

const years = [];
const today = new Date();
for (let y = 2017; y <= today.getFullYear(); ++y) {
  years.push(y);
}
</script>

<style scoped lang="scss">
.month-selector {
  overflow: hidden;
  display: grid;
  grid-template-columns: repeat(3, auto);
  border-radius: 3px;

  > .v-button {
    box-shadow: none;
  }
}
</style>
