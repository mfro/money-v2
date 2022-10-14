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
        {{ parts.length}} transactions =
        {{ Money.save(total)}}
      </span>

      <span class="ml-6"
            v-if="selection.length > 0">
        {{ selection.length}} selected =
        {{ Money.save(selectionTotal)}}
      </span>
    </v-flex>

    <div class="transactions mb-3"
         ref="transactionGrid">
      <template v-for="[t, p] in parts">
        <div class="transaction"
             :class="{ active: selection.includes(t) }"
             @click="e => onClickTransaction(t, e)">
          <span>{{t.date.year}}-{{t.date.month}}-{{t.date.day}}</span>
          <span>{{p.tags.array().map(tag =>
          tag.name).sort().join(space)}}</span>
          <span>{{p.label ?? t.description}}</span>
          <span style="justify-self: end">{{Money.save(context.partValueMap.get(p))}}</span>
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

const parts = computed(() =>
  context.parts.slice().sort(sort.value.compare)
);

const mode = shallowRef('view');
const textField = shallowRef(null);
const textFieldInput = shallowRef('');

const textFieldMatch = computed(() => {
  if (mode.value == 'edit') {
    if (!textFieldInput.value)
      return;

    const matches = data.tags.array().map(c => {
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

const selection = shallowReactive([]);

const transactionGrid = shallowRef(null);

const total = computed(() => {
  const cents = context.parts.reduce((sum, [t, p]) => sum + context.partValueMap.get(p).cents, 0);
  return { cents };
});

const selectionTotal = computed(() => {
  const cents = selection.reduce((sum, t) => sum + t.value.cents, 0);
  return { cents };
});

const sortOptions = [
  {
    label: 'Sort by date',
    compare(a, b) {
      return -(a[0].date.year - b[0].date.year)
        || -(a[0].date.month - b[0].date.month)
        || -(a[0].date.day - b[0].date.day);
    },
  },
  {
    label: 'Sort by value',
    compare(a, b) {
      return -(context.partValueMap.get(a).cents - context.partValueMap.get(b).cents);
    },
  },
];

const sort = shallowRef(sortOptions[0]);

function switchMode(m) {
  mode.value = m;
  textField.value?.focus();

  if (m == 'edit' && selection.length == 0) {
    autoSelect(true);
  }
}

function autoSelect(skip = false, reverse = false) {
  const last = selection[selection.length - 1];
  const index = context.parts.indexOf(last);

  const list = reverse
    ? context.parts.slice(index + 1)
    : context.parts.slice(0, index == -1 ? context.parts.length : index).reverse();

  const next = list.find(t => skip && t.tags.array().length == 0) ?? list[0];

  selection.length = 0;
  selection.push(
    ...context.parts
      .filter(t => t != next && t.array().length == 0 && t.description == next.description),
    next,
  );

  if (transactionGrid.value) {
    const position = 35 * context.parts.indexOf(next);
    const viewport = transactionGrid.value.clientHeight;

    transactionGrid.value.scrollTo({
      top: position - viewport / 2,
      behavior: 'smooth',
    });
  }
}

function onClickTransaction(transaction, e) {
  const index = selection.indexOf(transaction);
  if (index != -1) {
    if (e.shiftKey) {
      selection.splice(index, 1);
    } else if (selection.length > 1) {
      selection.length = 0;
      selection.push(transaction);
    } else {
      selection.length = 0;
    }
  } else {
    if (!e.shiftKey) {
      selection.length = 0;
    }

    selection.push(transaction);
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
  } else if (e.key == 'Tab') {
    e.preventDefault();
    autoSelect(false, e.shiftKey);
  }
}

function createTag() {
  return data.tags.insert({
    name: textFieldInput.value,
    tags: Collection.create(),
  });
}

function addTag(tag) {
  // const add = !selection[0].tags.array().includes(tag);
  // for (const transaction of selection) {
  //   if (add) {
  //     transaction.tagIds = [...transaction.tagIds, tag.id];
  //   } else {
  //     transaction.tagIds = transaction.tagIds.filter(id => id != tag.id);
  //   }
  // }
}

function norm(s) {
  return s.toLowerCase();
}
</script>

<style scoped lang="scss">
@import "@mfro/vue-ui/src/style.scss";

.transactions {
  border-radius: 3px;
  display: grid;
  overflow: auto;
  grid-template-columns: repeat(4, auto);

  > .transaction {
    display: grid;
    grid-column: span 4;
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
