import { Ref, watch } from 'vue';

import { Tag, Transaction } from '@/store';
import { UIContext } from './context';

export interface Filter {
  search?: string;
  includeTags?: string[];
  excludeTags?: string[];
}

export namespace Filter {
  export function empty(): Filter {
    return {};
  }

  export function fn(context: UIContext, filter: Filter) {
    const regex = filter.search && new RegExp(filter.search, 'i');

    return (value: Transaction | Tag) => {
      const closureArray = [...context.tagClosureMap.get(value)!].map(t => t.name);
      const closureSet = new Set([...context.tagClosureMap.get(value)!].map(t => t.name));

      return (!filter.includeTags?.length || filter.includeTags.every(name => closureSet.has(name)))
        && (!filter.excludeTags?.length || filter.excludeTags.every(name => !closureSet.has(name)))
        && (!regex || (
          closureArray.some(t => regex.test(t))
          || 'label' in value && regex.test(value.label)
        ))
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
