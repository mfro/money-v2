<template>
  <v-app row
         class="root">
    <!-- <pre class="pa-3">{{ JSON.stringify(context, null, '  ') }}</pre> -->

    <v-flex column
            class="mx-3">
      <YearSelector class="my-3"
                    style="flex: 0 0 auto"
                    v-model="year" />

      <MonthSelector class="mb-3"
                     style="flex: 0 0 auto"
                     v-model="month" />

      <v-flex class="stats mb-3">
        <span>{{ transactions.length}} transactions</span>
        <v-flex grow />
        <span>{{ Money.save(total)}}</span>
      </v-flex>

      <div class="tags">
        <div v-for="{ tag, value } in tags"
             class="tag"
             align-center
             :class="{ include: includeTags.includes(tag), exclude: excludeTags.includes(tag) }"
             @click="e => onClickTag(tag, e)"
             @contextmenu.prevent="e => onRightClickTag(tag, e)">
          <span>{{ tag.name }}</span>

          <span style="justify-self: end">{{ Money.save(value) }}</span>

          <v-button icon
                    x-small
                    @click="deleteTag(tag)">
            <v-icon>delete</v-icon>
          </v-button>
        </div>
      </div>
    </v-flex>

    <v-flex column
            grow>
      <v-flex align-center
              class="mt-3">
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
      </v-flex>

      <div class="transactions my-3"
           ref="transactionGrid">
        <template v-for="t in transactions">
          <div class="transaction"
               :class="{ active: selection.includes(t) }"
               @click="e => onClickTransaction(t, e)">
            <!-- <v-flex>
                <v-button x-small
                          v-for="id in t.tagIds"
                          @click="t.tagIds = t.tagIds.filter(i => i != id)">
                  {{ context.tags[id].name }}
                </v-button>
              </v-flex> -->
            <span>{{t.tagIds.map(id =>
            context.tags[id].name).sort().join(space)}}</span>
            <span>{{t.label ?? t.description}}</span>
            <span>{{t.date.year}}-{{t.date.month}}-{{t.date.day}}</span>
            <span style="justify-self: end">{{Money.save(t.value)}}</span>
          </div>
        </template>
      </div>
    </v-flex>

    <v-flex column>
      <Chart style="width: 400px; flex: 1 1 0"
             :transactions="transactions" />
    </v-flex>
  </v-app>
</template>

<script setup>
import { Collection } from '@mfro/sync-vue';
import { computed, inject, shallowRef, shallowReactive } from 'vue';

import { Money } from '@/common';
import Chart from './Chart';
import YearSelector from './YearSelector.vue';
import MonthSelector from './MonthSelector.vue';
import AutocompleteField from './AutocompleteField.vue';

const space = ' ';

const context = inject('context');

const mode = shallowRef('view');
const textField = shallowRef(null);
const textFieldInput = shallowRef('');

const textFieldMatch = computed(() => {
  if (mode.value == 'edit') {
    if (!textFieldInput.value)
      return;

    const matches = Collection.array(context.tags).map(c => {
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

const today = new Date();
const month = shallowRef(today.getMonth());
const year = shallowRef(today.getFullYear());
const includeTags = shallowReactive([]);
const excludeTags = shallowReactive([]);

const transactionGrid = shallowRef(null);
const transactions = computed(() => {
  const array = Collection.array(context.transactions)
    // .filter(t => t.date.year == year.value
    //   && t.date.month == month.value + 1
    // )
    .filter(t => includeTags.size == 0 || includeTags.every(tag => t.tagIds.includes(tag.id)))
    .filter(t => excludeTags.every(tag => !t.tagIds.includes(tag.id)))
    .sort((a, b) => {
      return -(a.date.year - b.date.year)
        || -(a.date.month - b.date.month)
        || -(a.date.day - b.date.day);
    })

  return array;
});

const tags = computed(() => {
  const array = Collection.array(context.tags)
    .map(tag => {
      const cents = transactions.value
        .filter(t => t.tagIds.includes(tag.id))
        .reduce((sum, t) => sum + t.value.cents, 0);

      return { tag, value: { cents: cents } };
    })
    .sort((a, b) => {
      return -(a.value.cents - b.value.cents);
    })

  return array;
});

const total = computed(() => {
  const cents = transactions.value.reduce((sum, t) => sum + t.value.cents, 0);
  return { cents };
});

function switchMode(m) {
  mode.value = m;
  textField.value?.focus();

  if (selection.length == 0) {
    autoSelect(true);
  }
}

function autoSelect(skip = false, reverse = false) {
  const last = selection[selection.length - 1];
  const index = transactions.value.indexOf(last);

  const list = reverse
    ? transactions.value.slice(index + 1)
    : transactions.value.slice(0, index == -1 ? transactions.value.length : index).reverse();

  const next = list.find(t => skip && t.tagIds.length == 0) ?? list[0];

  selection.length = 0;
  selection.push(
    ...transactions.value
      .filter(t => t != next && t.tagIds.length == 0 && t.description == next.description),
    next,
  );

  if (transactionGrid.value.$el) {
    const position = 35 * transactions.value.indexOf(next);
    const viewport = transactionGrid.value.$el.clientHeight;

    transactionGrid.value.$el.scrollTo({
      top: position - viewport / 2,
      behavior: 'smooth',
    });
  }
}

function toggleTag(list, tag) {
  const index = list.indexOf(tag);
  if (index == -1) {
    list.push(tag);
  } else {
    list.splice(index, 1);
  }

  textField.value?.focus();
}

function onClickTag(tag, e) {
  toggleTag(includeTags, tag);
}

function onRightClickTag(tag, e) {
  toggleTag(excludeTags, tag);
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
  return Collection.insert(context.tags, {
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

function deleteTag(tag) {
  for (const t of Collection.array(context.transactions)) {
    if (t.tagIds.includes(tag.id)) {
      t.tagIds = t.tagIds.filter(id => id != tag.id);
    }
  }

  Collection.remove(context.tags, tag.id);
}
</script>

<style>
#app {
  width: 100vw;
  height: 100vh;
}
</style>

<style scoped lang="scss">
@import "@mfro/vue-ui/src/style.scss";

.root {
  background-color: white !important;
}

.tags {
  display: grid;
  overflow: auto;
  grid-template-columns: 1fr auto;

  padding: (1 * $unit) 0;

  > .tag {
    display: grid;
    grid-column: span 4;
    grid-template-columns: subgrid;
    padding: (1 * $unit) (3 * $unit);
    padding-right: 0;
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

    &:hover:not(.include) {
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

.transactions {
  // background-color: white;
  border: 1px solid lightgray;

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

pre {
  white-space: pre;
  margin: 0;
}
</style>
