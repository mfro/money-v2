import { Money } from '@/common';
import { MoneyContext, Tag, Transaction, TransactionPart } from '@/store';
import { computed, reactive, shallowRef } from 'vue';

import { Filter } from './filter';

function allTags(data: MoneyContext, t: TransactionPart | Tag) {
  const set = new Set<Tag>();

  const queue: Tag[] = [];
  if ('label' in t) {
    queue.push(...t.tags.array());
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
  parts: [Transaction, TransactionPart][];
  transactions: Transaction[];

  tagClosureMap: Map<Tag | TransactionPart, Set<Tag>>,
  tagValueMap: Map<Tag, Money>;
  partValueMap: Map<TransactionPart, Money>;
}

export namespace UIContext {
  export function create(data: MoneyContext): UIContext {
    const filter = shallowRef(Filter.empty());

    const tags = computed(() =>
      data.tags.array()
        .filter(Filter.fn(context, filter.value))
    );

    const parts = computed(() =>
      data.accounts.array()
        .flatMap(a => a.transactions.array())
        .flatMap(t => t.parts.array().map(p => [t, p] as const))
        .filter(pair => Filter.fn(context, filter.value)(pair[1]))
    );

    const tagClosureMap = computed(() =>
      new Map<Tag | TransactionPart, Set<Tag>>([
        ...data.tags.array().map(t => [t, allTags(data, t)] as const),
        ...data.accounts.array()
          .flatMap(a => a.transactions.array())
          .flatMap(a => a.parts.array())
          .map(t => [t, allTags(data, t)] as const),
      ])
    );

    const partValueMap = computed(() =>
      new Map(
        data.accounts.array()
          .flatMap(a => a.transactions.array())
          .flatMap(t => {
            const total = t.parts.array().reduce((sum, p) => sum + p.ratio, 0);
            return t.parts.array().map(p => [p, { cents: p.ratio / total * t.value.cents }]);
          })
      )
    );

    const tagValueMap = computed(() =>
      new Map(data.tags.array().map(tag => [
        tag,
        {
          cents: parts.value
            .filter(t => Filter.fn(context, { includeTags: [tag.id] })(t[1]))
            .reduce((sum, t) => sum + partValueMap.value.get(t[1])!.cents, 0),
        },
      ]))
    );

    const context = reactive({
      data,
      filter,

      tags,
      parts,

      tagClosureMap,
      tagValueMap,
      partValueMap,
    }) as unknown as UIContext;

    return context;
  }
}
