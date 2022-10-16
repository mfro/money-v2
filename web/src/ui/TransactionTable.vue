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

      <template v-if="mode == 'edit'">
        <AutocompleteField v-model="editFieldInput"
                           :match="editFieldMatch?.name"
                           style="flex: 1 1 0"
                           @keydown="onKeyDownEditField"
                           ref="editField" />
      </template>
      <template v-else>
        <v-flex grow>
          <span>
            {{ transactions.length}} transactions =
            {{ Money.save(total)}}
          </span>

          <span class="ml-6"
                v-if="selection.length > 0">
            {{ selection.length}} selected =
            {{ Money.save(selectionTotal)}}
          </span>
        </v-flex>
      </template>

      <v-select class="mt-0 ml-3"
                :options="sortOptions"
                :text="o => o.label"
                v-model="sort" />
    </v-flex>

    <div class="transactions mb-3"
         ref="transactionGrid">
      <template v-for="t in transactions">
        <div class="transaction"
             :class="{ active: selection.includes(t) }"
             @click="e => onClickTransaction(t, e)">
          <span>{{t.date.year}}-{{t.date.month}}-{{t.date.day}}</span>
          <span>{{t.tags.array().map(tag =>
          tag.name).sort().join(space)}}</span>
          <span>{{t.label}}</span>
          <span style="justify-self: end">{{Money.save(t.value)}}</span>
        </div>
      </template>
    </div>
  </v-flex>
</template>

<script setup>
import { Collection } from '@mfro/sync-vue';
import { computed, inject, shallowRef, shallowReactive, nextTick } from 'vue';

import { Money } from '@/common';
import AutocompleteField from './AutocompleteField.vue';

const space = ' ';

const context = inject('context');

const transactions = computed(() =>
  context.transactions.slice().sort(sort.value.compare)
);

const selection = shallowReactive([]);

const mode = shallowRef('view');
const editField = shallowRef(null);
const editFieldInput = shallowRef('');

const editFieldMatch = computed(() => {
  if (mode.value == 'edit') {
    if (!editFieldInput.value)
      return;

    const matches = data.tags.array().map(c => {
      const index = norm(c.name).indexOf(editFieldInput.value);
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

const transactionGrid = shallowRef(null);

const total = computed(() => {
  const cents = context.transactions.reduce((sum, t) => sum + t.value.cents, 0);
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
      return -(a.date.year - b.date.year)
        || -(a.date.month - b.date.month)
        || -(a.date.day - b.date.day);
    },
  },
  {
    label: 'Sort by value',
    compare(a, b) {
      return -(a.value.cents - b.value.cents);
    },
  },
];

const sort = shallowRef(sortOptions[0]);

function switchMode(m) {
  mode.value = m;

  if (m == 'edit' && selection.length == 0) {
    autoSelect(true);
  }

  nextTick(() => {
    editField.value?.focus();
  });
}

function autoSelect(skip = false, reverse = false) {
  const last = selection[selection.length - 1];
  const index = transactions.value.indexOf(last);

  const list = index == -1
    ? transactions.value.slice()
    : [
      ...transactions.value.slice(index + 1),
      ...transactions.value.slice(0, index),
    ];

  if (!reverse) list.reverse();

  const next = list.find(t => skip && t.tags.array().length == 0) ?? list[0];

  selection.length = 0;
  selection.push(
    ...list
      .filter(t => t != next && t.tags.array().length == 0 && t.description == next.description),
    next,
  );

  if (transactionGrid.value) {
    const position = 35 * transactions.value.indexOf(next);
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
}

function onKeyDownEditField(e) {
  if (e.key == 'Enter') {
    if (editFieldInput.value == '') {
      autoSelect(true, e.shiftKey);
    } else if (e.ctrlKey) {
      addTag(createTag());
      editFieldInput.value = '';
    } else if (editFieldMatch.value) {
      addTag(editFieldMatch.value);
      editFieldInput.value = '';
    }
  } else if (e.key == 'ArrowUp') {
    autoSelect(false, false);
  } else if (e.key == 'ArrowDown') {
    autoSelect(false, true);
  }
}

function createTag() {
  return data.tags.insert({
    name: editFieldInput.value,
    tags: Collection.create(),
  });
}

function addTag(tag) {
  const add = !selection[0].tags.array().includes(tag);
  for (const transaction of selection) {
    if (add) {
      transaction.tags.insertRef(tag);
    } else {
      transaction.tags.remove(tag.id);
    }
  }
}

function norm(s) {
  return s.toLowerCase();
}
</script>

<style scoped lang="scss">
@import "@mfro/vue-ui/src/style.scss";

.transactions {
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
