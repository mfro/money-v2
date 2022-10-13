import { Ref, watch } from 'vue';

import { Tag, Transaction } from '@/store';
import { UIContext } from './context';

export interface Filter {
  includeTags?: number[];
  excludeTags?: number[];
}

export namespace Filter {
  export function empty(): Filter {
    return {};
  }

  export function fn(context: UIContext, filter: Filter) {
    return (value: Transaction | Tag) => {
      const closure = context.tagClosureMap.get(value)!;
      return (!filter.includeTags?.length || filter.includeTags.every(id => closure.has(context.data.tags.get(id))))
        && (!filter.excludeTags || filter.excludeTags.every(id => !closure.has(context.data.tags.get(id))));
    };
  }

  export function attachToUrl(filter: Ref<Filter>) {
    watch(filter, filter => {
      const url = new URL(location.href);
      url.searchParams.set('filter', JSON.stringify(filter));
      window.history.replaceState(null, '', url.toString());
    });

    const url = new URL(location.href);
    const initial = url.searchParams.get('filter');
    if (initial) {
      filter.value = JSON.parse(initial);
    }
  }
}
