import { computed, customRef, getCurrentInstance, Ref, shallowRef, watch } from 'vue';
import { LocationQuery, RouteLocation, useRoute, useRouter } from 'vue-router';

export function bindModel(name: string) {
  const self = getCurrentInstance()!;
  const update = `update:${name}`;

  return computed({
    get: () => self.props[name],
    set: v => self.emit(update, v),
  });
}

export function withQuery(route: RouteLocation, query: LocationQuery) {
  return {
    ...route,
    query: { ...route.query, ...query },
  };
}

export function defaultRef<T>(inner: Ref<T | null | undefined>, or: T) {
  return computed({
    get: () => inner.value ?? or,
    set: v => inner.value = v,
  });
}

export function routeQueryRef(name: string) {
  const route = useRoute();
  const router = useRouter();

  return computed({
    get() {
      if (name in route.query) {
        return JSON.parse(route.query[name] as string);
      } else {
        return undefined;
      }
    },

    set(v) {
      const query = { ...route.query };

      if (v === undefined) {
        delete query[name];
      } else {
        query[name] = JSON.stringify(v);
      }

      router.push({ ...route, query });
    },
  })
}

export function localStorageRef(name: string) {
  let value: any;

  try {
    const raw = localStorage.getItem(name);
    value = JSON.parse(raw!);
  } catch (e) {
    value = undefined;
  }

  return customRef((track, trigger) => ({
    get() {
      track();
      return value;
    },

    set(v) {
      value = v;
      localStorage.setItem(name, JSON.stringify(v));
      trigger();
    },
  }));
}
