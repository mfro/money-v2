import { Ref, watch } from 'vue';

import { Tag, Transaction } from '@/store';
import { UIContext } from './context';
import { Date as MyDate } from '@/common';

export interface Filter {
  search?: string;
  includeTags?: string[];
  excludeTags?: string[];
  after?: string;
  before?: string;
}

export namespace Filter {
  export function empty(): Filter {
    return {};
  }

  export function fn(context: UIContext, filter: Filter) {
    const regex = filter.search && new RegExp(filter.search, 'i');
    const before = filter.before ? new Date(filter.before) : new Date(Number.MAX_SAFE_INTEGER);
    const after = filter.after ? new Date(filter.after) : new Date(Number.MIN_SAFE_INTEGER);

    return (value: Transaction | Tag) => {
      const closureArray = [...context.tagClosureMap.get(value)!].map(t => t.name);
      const closureSet = new Set([...context.tagClosureMap.get(value)!].map(t => t.name));

      return (!filter.includeTags?.length || filter.includeTags.every(name => closureSet.has(name)))
        && (!filter.excludeTags?.length || filter.excludeTags.every(name => !closureSet.has(name)))
        && (!regex || (
          closureArray.some(t => regex.test(t))
          || 'label' in value && regex.test(value.label)
        ))
        && (!('date' in value) || !filter.before || dateCompare(value.date, before) <= 0)
        && (!('date' in value) || !filter.after || dateCompare(value.date, after) >= 0)
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

function dateCompare(b: MyDate, a: Date) {
  return (b.year - a.getFullYear())
    || (b.month - (a.getMonth() + 1))
    || (b.day - (a.getDate()))
}
