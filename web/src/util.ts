import { computed, getCurrentInstance } from "vue";
import { LocationQuery, RouteLocation } from "vue-router";

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
