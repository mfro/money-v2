<template>
  <div class="autocomplete-field"
       ref="rootRef">
    <v-text-field :model-value="modelValue"
                  @update:model-value="v => emit('update:modelValue', v)"
                  :style="matchInfo?.input_style"
                  solo
                  style="width: 100%; margin: 0"
                  @keydown="e => emit('keydown', e)"
                  ref="fieldRef" />

    <template v-if="matchInfo">
      <span class="prefix">{{ matchInfo.prefix }}</span>
      <span class="suffix"
            :style="matchInfo.suffix_style">{{ matchInfo.suffix }}</span>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, shallowRef } from 'vue';

const emit = defineEmits(['update:modelValue', 'keydown']);
const props = defineProps({
  modelValue: String,
  match: String,
});

const rootRef = shallowRef(null);
const fieldRef = shallowRef(null);

const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');

onMounted(() => {
  const style = window.getComputedStyle(rootRef.value);
  context.font = style.font;
});

const matchInfo = computed(() => {
  if (!props.match)
    return null;

  const index = props.match.indexOf(props.modelValue);

  const prefix = props.match.substring(0, index).replace(/ /g, '\xa0');
  const suffix = props.match.substring(index + props.modelValue.length).replace(/ /g, '\xa0');

  emit('update:modelValue', props.match.substring(index, index + props.modelValue.length));

  const w1 = context.measureText(prefix).width;
  const w2 = context.measureText(props.modelValue).width;

  return {
    prefix,
    suffix,

    input_style: {
      paddingLeft: `calc(${w1}px)`
    },

    suffix_style: {
      left: `calc(${w1 + w2}px)`
    },
  };
});

function focus() {
  fieldRef.value.focus();
}

defineExpose({ focus });
</script>

<style scoped lang="scss">
.autocomplete-field {
  display: flex;
  align-items: center;
  position: relative;

  > .prefix {
    opacity: 0.5;
    position: absolute;
    padding-left: 1em;
  }

  > .suffix {
    opacity: 0.5;
    position: absolute;
    padding-left: 1em;
  }
}
</style>
