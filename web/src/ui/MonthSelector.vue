<template>
  <div class="month-selector">
    <v-button class="month"
              tile
              :color="i == modelValue ? 'primary' : 'default'"
              @click="emit('update:modelValue', i)"
              v-for="(month, i) in months">
      {{ month }}
    </v-button>
  </div>
</template>

<script setup>
const emit = defineEmits('update:modelValue');
const props = defineProps({
  modelValue: {},
});

const months = [];
const format = new Intl.DateTimeFormat(undefined, {
  month: 'long',
});

const date = new Date();
date.setDate(1);

for (let i = 0; i < 12; ++i) {
  date.setMonth(i);
  months.push(format.format(date));
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
