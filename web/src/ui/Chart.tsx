import { Chart, registerables } from 'chart.js';
import { defineComponent, inject, shallowRef, watchEffect } from 'vue';
import { assert } from '@mfro/assert';
import { UIContext } from '@/ui/context';
import { Filter } from './filter';

import './Chart.scss';
import { Tag } from '@/store';
import { Money } from '@/common';
import { useRouter } from 'vue-router';

Chart.register(...registerables);

export interface Graph {
  type: GraphType;
  canvas: HTMLCanvasElement | null;
}

export type GraphType = 'tag' | 'month' | 'day';

const palette = [
  '#a50026',
  '#d73027',
  '#f46d43',
  '#fdae61',
  '#fee08b',
  '#ffffbf',
  '#d9ef8b',
  '#a6d96a',
  '#66bd63',
  '#1a9850',
  '#006837',
];

export default defineComponent({
  props: {
    type: String,
    month: Object,
  },

  setup(props) {
    const router = useRouter();
    const context = inject<UIContext>('context')!;

    const canvas = shallowRef<null | HTMLCanvasElement>(null);

    let chart: Chart;

    watchEffect(render, { flush: 'post' });
    function render() {
      chart?.destroy();

      if (!canvas.value) return;

      const bounds = canvas.value.getBoundingClientRect()
      const ctx = canvas.value.getContext('2d');
      assert(ctx != null, 'data');

      if (props.type == 'by-month') {
        const data = new Map<string, Map<string, { value: number }>>();
        const byMonth = new Map<string, { date: Date }>();
        const byUnique = new Map<string, { value: number }>();
        const byRoot = new Map<Tag, { value: number }>();

        for (const t of context.transactions) {
          const date = new Date(t.date.year, t.date.month - 1);

          const monthLabel = date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
          });

          let month = byMonth.get(monthLabel);
          if (!month) byMonth.set(monthLabel, month = { date });

          const roots = [...context.tagClosureMap.get(t)!]
            .filter(tag => !context.filter.includeTags?.includes(tag.name))
            .filter(tag => tag.tags.array().filter(t => !context.filter.includeTags?.includes(t.name)).length == 0);

          // const unique = roots.map(tag => tag.name).sort().join(' ');
          const unique = t.tags.array().map(tag => tag.name).sort().join(' ');

          let info = byUnique.get(unique);
          if (!info) byUnique.set(unique, info = { value: 0 });
          info.value += t.value.cents;

          for (const root of roots) {
            let info = byRoot.get(root);
            if (!info) byRoot.set(root, info = { value: 0 });
            info.value += t.value.cents;

            let x = data.get(root.name);
            if (!x) data.set(root.name, x = new Map());

            let y = x.get(monthLabel);
            if (!y) x.set(monthLabel, y = { value: 0 });

            y.value += t.value.cents;
          }
        }

        const sign = [...data].flatMap(u => [...u[1]]).every(v => v[1].value <= 0) ? -1 : 1;

        const months = [...byMonth]
          .sort((a, b) => a[1].date.valueOf() - b[1].date.valueOf())
          .map(e => e[0]);

        // const tags = [...byUnique]
        //   .sort((a, b) => a[1].value - b[1].value)
        //   // .slice(0, palette.length);

        const tags = [...byRoot]
          .sort((a, b) => a[1].value - b[1].value)
        // .slice(0, palette.length);

        const datasets = [];

        for (let i = 0; i < tags.length; ++i) {
          const label = tags[i][0];
          const x = data.get(label.name)!;
          const color = palette[i % palette.length];

          datasets.push({
            label: label.name,
            data: months.map(t => sign * (x.get(t)?.value ?? 0) / 100),
            backgroundColor: color,
            borderColor: 'black',
            borderWidth: 1,
            borderSkipped: false,
          });
        }

        chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: months,
            datasets,
          },
          options: {
            aspectRatio: bounds.width / bounds.height,

            scales: {
              x: {
                stacked: true,
              },
              y: {
                stacked: true
              }
            },
          },
        });
      } else if (props.type == 'by-tag') {
        const roots = new Set<Tag>();
        const uniqueMap = new Map<string, { closure: Set<Tag>, value: number }>();

        for (const t of context.transactions) {
          const closure = context.tagClosureMap.get(t)!;
          const tagString = t.tags.array().map(tag => tag.name).sort().join(' ');

          let info = uniqueMap.get(tagString);
          if (!info) uniqueMap.set(tagString, info = { closure, value: 0 });

          info.value += t.value.cents;
          for (const tag of closure) roots.add(tag);
        }

        const unique = [...uniqueMap].sort((a, b) => a[1].value - b[1].value);

        const tagList = [...roots]
          .sort((a, b) => context.tagValueMap.get(a)!.cents - context.tagValueMap.get(b)!.cents);

        const labels = tagList.map(t => t.name);

        // const colorA = [0x00, 0xc0, 0x00];
        // const colorB = [0x00, 0x00, 0x00];

        // const colorStep = colorB.map((v, i) => (v - colorA[i]) / labels.length);
        // const colors = labels.map((_, index) => '#' + colorA.map((v, i) => Math.round(v + colorStep[i] * index).toString(16).padStart(2, '0')).join(''));
        const colors = palette

        const sign = unique.every(v => v[1].value < 0) ? -1 : 1;

        const datasets: any[] = [];
        for (let i = 0; i < unique.length; ++i) {
          const [string, { closure, value }] = unique[i];
          const color = colors[i % colors.length];

          datasets.push({
            label: string,
            data: tagList.map(t => closure.has(t) ? sign * value / 100 : 0),
            backgroundColor: color,
            borderColor: 'black',
            borderWidth: 1,
            borderSkipped: false,
          });
        }

        chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets,
          },
          options: {
            aspectRatio: bounds.width / bounds.height,
            indexAxis: 'x',
            plugins: {
              legend: {
                display: false,
              },
            },
            scales: {
              x: {
                stacked: true,
              },
              y: {
                stacked: true
              }
            },
          },
        });
      } else if (props.type == 'by-tag-unique') {
        const tags = new Map<string, { value: number }>();

        for (const t of context.transactions) {
          const tagString = [...context.tagClosureMap.get(t)!]
            .map(tag => tag.name).sort().join(' ');

          let info = tags.get(tagString);
          if (!info) tags.set(tagString, info = { value: 0 });

          info.value += t.value.cents;
        }

        const src = [...tags].sort((a, b) => a[1].value - b[1].value);
        const sign = src.every(v => v[1].value < 0) ? -1 : 1;

        const labels = src.map(v => v[0]);
        const values = src.map(v => sign * v[1].value / 100);

        chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{
              label: 'money',
              data: values,
              backgroundColor: [
                // '#a50026',
                // '#d73027',
                // '#f46d43',
                // '#fdae61',
                // '#fee08b',
                // '#ffffbf',
                // '#d9ef8b',
                // '#a6d96a',
                // '#66bd63',
                '#1a9850',
                // '#006837',
              ],
            }],
          },
          options: {
            aspectRatio: bounds.width / bounds.height,
            indexAxis: 'x',
            plugins: {
              legend: {
                display: false,
              },
            },
          },
        });
      } else {
        console.warn(`unknown type: ${props.type}`);
      }
    }

    function inspectYear(year: number) {
      const filter: Filter = {
        ...context.filter,
        after: `${year}-01-01`,
        before: `${year}-12-31`,
      };

      router.push({
        path: '/transactions',
        query: {
          filter: JSON.stringify(filter),
          chart: 'true',
          table: 'false',
        },
      })
    }

    function inspectMonth(month: Date) {
      const filter: Filter = {
        ...context.filter,
      };

      const after = new Date(month.valueOf());
      after.setDate(1);

      const before = new Date(month.valueOf());
      before.setMonth(before.getMonth() + 1);
      before.setDate(0);

      filter.after = after.toDateString();
      filter.before = before.toDateString();

      router.push({
        path: '/transactions',
        query: {
          filter: JSON.stringify(filter),
          chart: 'false',
          table: 'true',
        },
      })
    }

    function inspect(month: Date | null, tag: Tag) {
      const filter: Filter = {
        ...context.filter,
      };

      if (month) {
        const after = new Date(month.valueOf());
        after.setDate(1);

        const before = new Date(month.valueOf());
        before.setMonth(before.getMonth() + 1);
        before.setDate(0);

        filter.after = after.toDateString();
        filter.before = before.toDateString();
      }

      if (tag) {
        filter.includeTags = [...filter?.includeTags ?? [], tag.name];
      }

      router.push({
        path: '/transactions',
        query: {
          filter: JSON.stringify(filter),
          chart: (!month).toString(),
          table: (!!month).toString(),
        },
      })
    }

    if (props.type == 'spectrum') {
      return () => {
        const data = new Map<Tag, Map<string, { value: number }>>();
        const byMonth = new Map<string, { value: number, date: Date }>();
        const byRoot = new Map<Tag, { value: number }>();

        for (const t of context.transactions) {
          const date = new Date(t.date.year, t.date.month - 1);

          const monthLabel = date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
          });

          let month = byMonth.get(monthLabel);
          if (!month) byMonth.set(monthLabel, month = { value: 0, date });

          const roots = [...context.tagClosureMap.get(t)!]
            .filter(tag => !context.filter.includeTags?.includes(tag.name))
            .filter(tag => tag.tags.array().filter(t => !context.filter.includeTags?.includes(t.name)).length == 0);

          month.value += t.value.cents;

          for (const root of roots) {
            let info = byRoot.get(root);
            if (!info) byRoot.set(root, info = { value: 0 });
            info.value += t.value.cents;

            let x = data.get(root);
            if (!x) data.set(root, x = new Map());

            let y = x.get(monthLabel);
            if (!y) x.set(monthLabel, y = { value: 0 });

            y.value += t.value.cents;
          }
        }

        const months = [...byMonth]
          .sort((a, b) => a[1].date.valueOf() - b[1].date.valueOf());

        const years = [...new Set(months.map(m => m[1].date.getFullYear()))]
          .map(y => [y, months.filter(m => m[1].date.getFullYear() == y).length] as const)

        const entries = [
          <div />,
          months.map(m => (
            <v-tooltip text={`${m[0]}: ${Money.save({ cents: m[1].value })}`}>
              <div class="cell month" style={{ height: `${Math.abs(m[1].value / 1000)}px` }}
                onClick={() => inspectMonth(m[1].date)} />
            </v-tooltip>
          )),
          <div />,
          years.map(y => (
            <div class="top header" style={{ 'grid-column-end': `span ${y[1]}` }} onClick={() => inspectYear(y[0])}>
              {y[0]}
            </div>
          )),
          // <div />,
          // months.map(m => (
          //   <div class="top header" onClick={() => inspectMonth(m[1].date)}>
          //     {m[1].date.getMonth() + 1}
          //   </div>
          // )),
          ...[...byRoot]
            .sort((a, b) => a[1].value - b[1].value)
            .flatMap((e, i) => [
              <div class="side header" onClick={() => inspect(null, e[0])}>
                {e[0].name}
              </div>,
              ...months.map(m => {
                const cents = Math.abs(data.get(e[0])!.get(m[0])?.value ?? 0);

                return (
                  <v-tooltip text={`${m[0]} ${e[0].name}: ${Money.save({ cents })}`}>
                    <div class="cell" style={{ color: palette[9], height: `${cents / 1000}px` }}
                      onClick={() => inspect(m[1].date, e[0])} />
                  </v-tooltip>
                );
              })
            ]),
        ];

        return (
          <div class="mfro-chart-grid" style={{ 'grid-template-columns': `1fr repeat(${months.length}, 1fr)` }}>
            {entries}
          </div>
        )
      };
    } else {
      return () => <canvas ref={canvas} />
    }
  },
});
