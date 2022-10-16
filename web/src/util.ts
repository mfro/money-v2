import { computed, getCurrentInstance } from 'vue';
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

export function routeQuery(name: string, def: any) {
  const route = useRoute();
  const router = useRouter();

  return computed({
    get: () => name in route.query ? JSON.parse(route.query[name] as string) : def,
    set: v => router.push(withQuery(route, { [name]: JSON.stringify(v) })),
  })
}
