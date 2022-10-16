<template>
  <div class="tag-filter">
    <div v-for="{ tag, value } in tags"
         class="tag"
         align-center
         :class="{ include: context.filter.includeTags?.includes(tag.name), exclude: context.filter.excludeTags?.includes(tag.name) }"
         @click="e => onClickTag(tag, e)"
         @contextmenu.prevent="e => onRightClickTag(tag, e)">
      <span>{{ tag.name }}</span>

      <span style="justify-self: end">{{ Money.save(value) }}</span>

      <!-- <v-button icon
                x-small
                @click="deleteTag(tag)">
        <v-icon>delete</v-icon>
      </v-button> -->
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';

import { Money } from '@/common';

const context = inject('context');

const tags = computed(() =>
  context.data.tags.array()
    .map(tag => ({
      tag,
      value: context.tagValueMap.get(tag)
    }))
    .sort((a, b) => {
      return -(a.value.cents - b.value.cents)
        || a.tag.name.localeCompare(b.tag.name);
    })
);

// function deleteTag(tag) {
//   for (const t of Collection.array(data.transactions)) {
//     if (t.tagIds.includes(tag.id)) {
//       t.tagIds = t.tagIds.filter(id => id != tag.id);
//     }
//   }

//   Collection.remove(data.tags, tag.id);
// }

function toggleTag(key, tag) {
  const list = context.filter[key]?.slice() ?? [];

  const index = list.indexOf(tag.name);
  if (index == -1) {
    list.push(tag.name);
  } else {
    list.splice(index, 1);
  }

  context.filter = { ...context.filter, [key]: list };
}

function onClickTag(tag, e) {
  toggleTag('includeTags', tag);
}

function onRightClickTag(tag, e) {
  toggleTag('excludeTags', tag);
}

</script>

<style scoped lang="scss">
@import "@mfro/vue-ui/src/style.scss";

.tag-filter {
  overflow: auto;

  display: grid;
  grid-auto-rows: max-content;
  grid-template-columns: minmax(max-content, 1fr) auto;

  font-size: 0.75em;

  > .tag {
    overflow: hidden;

    display: grid;
    grid-column: span 4;
    grid-template-columns: subgrid;

    padding: (1 * $unit) (3 * $unit);
    cursor: pointer;
    user-select: none;
    border-radius: 3px;
    position: relative;

    &.include {
      background-color: $primary;
      color: white;
      font-weight: bold;
    }

    &.exclude {
      background-color: $error;
      color: white;
      font-weight: bold;
    }

    &:hover:not(.include):not(.exclude) {
      background-color: #efefef;

      > .v-button {
        opacity: 1;
      }
    }

    > .v-button {
      opacity: 0;
      transition: opacity 100ms;
    }
  }
}
</style>
