import { Money } from '@/common';
import { MoneyContext, Tag, Transaction } from '@/store';
import { computed, reactive, shallowRef } from 'vue';

import { Filter } from './filter';

function allTags(data: MoneyContext, t: Transaction | Tag) {
  const set = new Set<Tag>();

  const queue: number[] = [];
  if ('description' in t) {
    queue.push(...t.tagIds);
  } else {
    queue.push((t as any).id);
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const next = data.tags.get(id);

    set.add(next);
    queue.push(...next.tagIds.filter(id => !set.has(data.tags.get(id))));
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
  export function create(data: MoneyContext): UIContext {
    const filter = shallowRef(Filter.empty());

    const tags = computed(() =>
      data.tags.array()
        .filter(Filter.fn(context, filter.value))
    );

    const transactions = computed(() =>
      data.transactions.array()
        .filter(Filter.fn(context, filter.value))
    );

    const tagClosureMap = computed(() =>
      new Map<Tag | Transaction, Set<Tag>>([
        ...data.tags.array().map(t => [t, allTags(data, t)] as const),
        ...data.transactions.array().map(t => [t, allTags(data, t)] as const),
      ])
    );

    const tagValueMap = computed(() =>
      new Map(data.tags.array().map(tag => [
        tag,
        {
          cents: transactions.value
            .filter(t => Filter.fn(context, { includeTags: [tag.id] })(t))
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
