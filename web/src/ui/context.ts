import { Money } from '@/common';
import { Collection, MoneyContext, Tag, Transaction } from '@/store';
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
    const next = data.tags[id];

    set.add(next);
    queue.push(...next.tagIds.filter(id => !set.has(data.tags[id])));
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
      Collection.array(data.tags)
        .filter(Filter.fn(context, filter.value))
    );

    const transactions = computed(() =>
      Collection.array(data.transactions)
        .filter(Filter.fn(context, filter.value))
    );

    const tagClosureMap = computed(() =>
      new Map<Tag | Transaction, Set<Tag>>([
        ...Collection.array(data.tags).map(t => [t, allTags(data, t)] as const),
        ...Collection.array(data.transactions).map(t => [t, allTags(data, t)] as const),
      ])
    );

    const tagValueMap = computed(() =>
      new Map(Collection.array(data.tags).map(tag => [
        tag,
        {
          cents: transactions.value
            .filter(t => Filter.fn(context, { includeTags: [tag.id] })(t))
            .reduce((sum, t) => sum + t.value.cents, 0),
        },
      ]))
    );

    const context: UIContext = reactive({
      data,
      filter,

      tags,
      transactions,

      tagClosureMap,
      tagValueMap,
    });

    return context;
  }
}
