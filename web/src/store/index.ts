import { join_new, join, Collection } from '@mfro/sync-vue';
export { Collection };

import { init } from './v1';
export * from './v1';

export async function open() {
  const url = new URL(location.href);
  const idParam = url.searchParams.get('id');

  if (idParam) {
    const { data } = await join('wss://api.mfro.me/sync', idParam);
    return init(data);
  } else {
    const { data, id } = await join_new('wss://api.mfro.me/sync');

    url.searchParams.set('id', id);
    window.history.replaceState(null, '', url.toString());

    return init(data);
  }
}
