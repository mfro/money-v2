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
        {{ transactions.length}} transactions =
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
      <template v-for="t in transactions">
        <div class="transaction"
             :class="{ active: selection.includes(t) }"
             @click="e => onClickTransaction(t, e)">
          <span>{{t.date.year}}-{{t.date.month}}-{{t.date.day}}</span>
          <span>{{t.tagIds.map(id =>
          context.data.tags[id].name).sort().join(space)}}</span>
          <span>{{t.label ?? t.description}}</span>
          <span style="justify-self: end">{{Money.save(t.value)}}</span>
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
import { UIContext } from './context';

const space = ' ';

const context = inject('context');

const transactions = computed(() =>
  context.transactions.slice().sort(sort.value.compare)
);

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

const selection = shallowReactive([]);

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
  textField.value?.focus();

  if (m == 'edit' && selection.length == 0) {
    autoSelect(true);
  }
}

function autoSelect(skip = false, reverse = false) {
  const last = selection[selection.length - 1];
  const index = context.transactions.indexOf(last);

  const list = reverse
    ? context.transactions.slice(index + 1)
    : context.transactions.slice(0, index == -1 ? context.transactions.length : index).reverse();

  const next = list.find(t => skip && t.tagIds.length == 0) ?? list[0];

  selection.length = 0;
  selection.push(
    ...context.transactions
      .filter(t => t != next && t.tagIds.length == 0 && t.description == next.description),
    next,
  );

  if (transactionGrid.value) {
    const position = 35 * context.transactions.indexOf(next);
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
  return Collection.insert(data.tags, {
    name: textFieldInput.value,
    tagIds: [],
  });
}

function addTag(tag) {
  const add = !selection[0].tagIds.includes(tag.id);
  for (const transaction of selection) {
    if (add) {
      transaction.tagIds = [...transaction.tagIds, tag.id];
    } else {
      transaction.tagIds = transaction.tagIds.filter(id => id != tag.id);
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