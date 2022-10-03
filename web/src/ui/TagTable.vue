<template>
  <v-flex column
          grow>
    <v-flex align-center
            class="my-3">
      <v-button icon
                class="mr-3"
                :color="mode == 'edit' ? 'primary' : 'default'"
                @click="switchMode(mode == 'edit' ? 'view' : 'edit')">
        <v-icon>edit</v-icon>
      </v-button>

      <AutocompleteField v-model="textFieldInput"
                         :match="textFieldMatch?.name"
                         style="flex: 1 1 0"
                         @keydown="onKeyDownTextField"
                         ref="textField" />

      <v-select class="mt-0 ml-3"
                :options="sortOptions"
                :text="o => o.label"
                v-model="sort" />
    </v-flex>

    <v-flex class="stats mb-3">
      <span>
        {{ sortedTags.length }} tags =
        {{ Money.save(total) }}
      </span>

      <span class="ml-6"
            v-if="selection.length > 0">
        {{ selection.length }} selected =
        {{ Money.save(selectionTotal) }}
      </span>
    </v-flex>

    <div class="tags mb-3"
         ref="grid">
      <template v-for="t in sortedTags">
        <div class="tag"
             :class="{ active: selection.includes(t) }"
             @click="e => onClickTag(t, e)">
          <span>{{t.name}}</span>
          <span>{{t.tagIds.map(id =>
          context.data.tags[id].name).sort().join(space)}}</span>
          <span
                style="justify-self: end">{{Money.save(context.tagValueMap.get(t))}}</span>
        </div>
      </template>
    </div>
  </v-flex>
</template>

<script setup>
import { Collection } from '@mfro/sync-vue';
import { computed, inject, shallowRef, shallowReactive } from 'vue';

import { Money } from '@/common';

import AutocompleteField from './AutocompleteField.vue';

const space = ' ';

const context = inject('context');

const sortedTags = computed(() =>
  context.tags.slice().sort(sort.value.compare)
);

const selection = shallowReactive([]);

const mode = shallowRef('view');
const textField = shallowRef(null);
const textFieldInput = shallowRef('');

const textFieldMatch = computed(() => {
  if (mode.value == 'edit') {
    if (!textFieldInput.value)
      return;

    const matches = Collection.array(data.tags).map(c => {
      const index = norm(c.name).indexOf(textFieldInput.value);
      if (index == -1)
        return null;

      return [index, c];
    }).filter(n => n);

    if (matches.length == 0)
      return;

    matches.sort((a, b) => {
      if (a[0] != b[0]) return a[0] - b[0];
      return a[1].name.localeCompare(b[1].name);
    });

    return matches[0][1];
  }
});

const grid = shallowRef(null);

const total = computed(() => {
  const cents = context.tags.reduce((sum, t) => sum + context.tagValueMap.get(t).cents, 0);

  return { cents };
});

const selectionTotal = computed(() => {
  const cents = selection.reduce((sum, t) => sum + context.tagValueMap.get(t).cents, 0);
  return { cents };
});

const sortOptions = [
  {
    label: 'Sort by value',
    compare(a, b) {
      return -(context.tagValueMap.get(a).cents - context.tagValueMap.get(b).cents);
    },
  },
  {
    label: 'Sort by name',
    compare(a, b) {
      return a.name.localeCompare(b.name);
    },
  },
];

const sort = shallowRef(sortOptions[0]);

function switchMode(m) {
  mode.value = m;
  textField.value?.focus();
}

function autoSelect(skip = false, reverse = false) {
  const last = selection[selection.length - 1];
  const index = sortedTags.value.indexOf(last);

  const list = reverse
    ? sortedTags.value.slice(index + 1)
    : sortedTags.value.slice(0, index == -1 ? sortedTags.value.length : index).reverse();

  const next = list.find(t => skip && t.tagIds.length == 0) ?? list[0];

  selection.length = 0;
  selection.push(next);

  if (grid.value) {
    const position = 35 * sortedTags.value.indexOf(next);
    const viewport = grid.value.clientHeight;

    grid.value.scrollTo({
      top: position - viewport / 2,
      behavior: 'smooth',
    });
  }
}

function onClickTag(tag, e) {
  const index = selection.indexOf(tag);
  if (index != -1) {
    if (e.shiftKey) {
      selection.splice(index, 1);
    } else if (selection.length > 1) {
      selection.length = 0;
      selection.push(tag);
    } else {
      selection.length = 0;
    }
  } else {
    if (!e.shiftKey) {
      selection.length = 0;
    }

    selection.push(tag);
  }

  textField.value?.focus();
}

function onKeyDownTextField(e) {
  if (e.key == 'Enter') {
    if (textFieldInput.value == '') {
      autoSelect(true, e.shiftKey);
    } else if (e.ctrlKey) {
      addTag(createTag());
      textFieldInput.value = '';
    } else if (textFieldMatch.value) {
      addTag(textFieldMatch.value);
      textFieldInput.value = '';
    }
  } else if (e.key == 'ArrowUp') {
    autoSelect(false, false);
  } else if (e.key == 'ArrowDown') {
    autoSelect(false, true);
  }
}

function createTag() {
  return Collection.insert(data.tags, {
    name: textFieldInput.value,
    tagIds: [],
  });
}

function addTag(tag) {
  const add = !selection[0].tagIds.includes(tag.id);
  for (const target of selection) {
    if (add) {
      target.tagIds = [...target.tagIds, tag.id];
    } else {
      target.tagIds = target.tagIds.filter(id => id != tag.id);
    }
  }
}

function norm(s) {
  return s.toLowerCase();
}
</script>

<style scoped lang="scss">
@import "@mfro/vue-ui/src/style.scss";

.tags {
  border-radius: 3px;
  display: grid;
  overflow: auto;
  grid-template-columns: repeat(3, auto);

  > .tag {
    display: grid;
    grid-column: span 3;
    grid-template-columns: subgrid;
    padding: 2 * $unit;
    cursor: pointer;
    user-select: none;

    &:hover {
      background-color: #efefef;
    }

    &.active {
      background-color: $primary;
      color: white;
      font-weight: bold;
    }
  }
}
</style>
