import { MoneyContext, Tag, Transaction } from '@/store';
import { Money } from '@/common';
import { computed, reactive, Ref } from 'vue';

import { Filter } from './filter';

function tagClosure(data: MoneyContext, t: Transaction | Tag) {
  const set = new Set<Tag>();

  const queue: Tag[] = [];
  if ('label' in t) {
    queue.push(...t.tags);
  } else {
    queue.push(t);
  }

  while (queue.length > 0) {
    const next = queue.shift()!;
    set.add(next);

    queue.push(...next.tags.array().filter(tag => !set.has(tag)));
  }

  return set;
}

export interface UIContext {
  data: MoneyContext;

  filter: Filter;

  tags: Tag[];
  transactions: Transaction[];

  tagClosureMap: Map<Tag | Transaction, Set<Tag>>,
  tagValueMap: Map<Tag, Money>;
}

export namespace UIContext {
  export function create(data: MoneyContext, filter: Ref<Filter>): UIContext {
    const tags = computed(() =>
      data.tags.array()
        .filter(Filter.fn(context, filter.value))
    );

    const transactions = computed(() =>
      data.transactions.array()
        .filter(Filter.fn(context, filter.value))
    );

    const tagClosureMap = computed(() =>
      new Map<Tag | Transaction, Set<Tag>>(
        [...data.tags, ...data.transactions]
          .map(t => [t, tagClosure(data, t)] as const),
      )
    );

    const tagValueMap = computed(() =>
      new Map(data.tags.array().map(tag => [
        tag,
        {
          cents: transactions.value
            .filter(Filter.fn(context, { includeTags: [tag.name] }))
            .reduce((sum, t) => sum + t.value.cents, 0),
        },
      ]))
    );

    const context = reactive({
      data,
      filter,

      tags,
      transactions,

      tagClosureMap,
      tagValueMap,
    }) as unknown as UIContext;

    return context;
  }
}
