import { Chart, registerables } from 'chart.js';
import { defineComponent, h, inject, Ref, shallowRef, toRef, watchEffect } from 'vue';
import { assert } from '@mfro/assert';
import { MoneyContext, Tag, Transaction } from '@/store';
import { UIContext } from '@/ui/context';

Chart.register(...registerables);

export interface Graph {
  type: GraphType;
  canvas: HTMLCanvasElement | null;
}

export type GraphType = 'tag' | 'month' | 'day';

export default defineComponent({
  props: {
    type: String,
  },

  setup(props) {
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
        const months = new Map<string, { date: Date, value: number }>();

        for (const t of context.transactions) {
          // const date = graph.type == 'day'
          //   ? new Date(t.date.year, t.date.month - 1, t.date.day)
          //   : new Date(t.date.year, t.date.month - 1);
          const date = new Date(t.date.year, t.date.month - 1);

          const month = date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            // day: graph.type == 'day' ? 'numeric' : undefined,
          });

          let info = months.get(month);
          if (!info) months.set(month, info = { date, value: 0 });

          info.value += t.value.cents;
        }

        const src = [...months].sort((a, b) => a[1].date.valueOf() - b[1].date.valueOf());
        const sign = src.every(v => v[1].value < 0) ? -1 : 1;

        const labels = src.map(v => v[0]);
        const values = src.map(v => sign * v[1].value / 100);

        chart = new Chart(ctx, {
          type: 'bar',
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
      } else if (props.type == 'by-tag') {
        const roots = new Set<Tag>();
        const uniqueMap = new Map<string, { closure: Set<Tag>, value: number }>();

        for (const t of context.transactions) {
          const closure = context.tagClosureMap.get(t)!;
          const tagString = t.tagIds.map(id => context.data.tags[id].name).sort().join(' ');

          let info = uniqueMap.get(tagString);
          if (!info) uniqueMap.set(tagString, info = { closure, value: 0 });

          info.value += t.value.cents;
          for (const tag of closure) roots.add(tag);
        }

        const unique = [...uniqueMap].sort((a, b) => a[1].value - b[1].value);

        const tagList = [...roots].sort((a, b) => context.tagValueMap.get(a)!.cents - context.tagValueMap.get(b)!.cents);
        const labels = tagList.map(t => t.name);

        const colorA = [0x00, 0xc0, 0x00];
        const colorB = [0x00, 0x00, 0x00];

        const colorStep = colorB.map((v, i) => (v - colorA[i]) / labels.length);
        // const colors = labels.map((_, index) => '#' + colorA.map((v, i) => Math.round(v + colorStep[i] * index).toString(16).padStart(2, '0')).join(''));
        const colors = [
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
            }
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

    return () => <canvas ref={canvas} />
  },
});

// export function initGraph(context: MoneyContext, filter: Filter, cache: Cache) {
  // let chart: Chart<any> | undefined;
  // let graph: Graph = myReactive({
  //   type: 'tag',
  //   canvas: null,
  // });

  // watchEffect(render, { flush: 'post' });
  // window.addEventListener('resize', render);

  // return graph;

  // function render() {
  //   chart?.destroy();

  //   if (!graph.canvas || !graph.type) return;

  //   const bounds = graph.canvas.getBoundingClientRect()
  //   const context = graph.canvas.getContext('2d');
  //   assert(context != null, 'context');

  //   if (graph.type == 'tag') {
  //     const src = data.tags
  //       .filter(tag => !filter.include.has(tag))
  //       .map(t => [t, cache.byTagFiltered(t)] as const)
  //       .filter(([tag, info]) => info.total.cents != 0)
  //       .map(([tag, info]) => [tag.value, info.total.cents / 100] as const)
  //       .sort((a, b) => a[1] - b[1]);

  //     const labels = src.map(v => v[0]);
  //     const values = src.map(v => v[1]);

  //     chart = new Chart(context, {
  //       type: 'bar',
  //       data: {
  //         labels,
  //         datasets: [{
  //           label: 'money',
  //           data: values,
  //           backgroundColor: [
  //             // '#a50026',
  //             // '#d73027',
  //             // '#f46d43',
  //             // '#fdae61',
  //             // '#fee08b',
  //             // '#ffffbf',
  //             // '#d9ef8b',
  //             // '#a6d96a',
  //             // '#66bd63',
  //             '#1a9850',
  //             // '#006837',
  //           ],
  //         }],
  //       },
  //       options: {
  //         aspectRatio: bounds.width / bounds.height,
  //         indexAxis: 'y',
  //       },
  //     });
  //   } else {
  //     const months = new Map<string, { date: Date, value: number }>();

  //     for (const expense of filter.result) {
  //       const date = graph.type == 'day'
  //         ? new Date(expense.transaction.date.year, expense.transaction.date.month - 1, expense.transaction.date.day)
  //         : new Date(expense.transaction.date.year, expense.transaction.date.month - 1);

  //       const month = date.toLocaleDateString(undefined, {
  //         year: 'numeric',
  //         month: 'short',
  //         day: graph.type == 'day' ? 'numeric' : undefined,
  //       });

  //       let info = months.get(month);
  //       if (!info) months.set(month, info = { date, value: 0 });

  //       info.value += expense.transaction.value.cents;
  //     }

  //     const src = [...months].sort((a, b) => a[1].date.valueOf() - b[1].date.valueOf());

  //     const labels = src.map(v => v[0]);
  //     const data = src.map(v => v[1].value / 100);

  //     chart = new Chart(context, {
  //       type: 'bar',
  //       data: {
  //         labels,
  //         datasets: [{
  //           label: 'money',
  //           data,
  //           backgroundColor: [
  //             // '#a50026',
  //             // '#d73027',
  //             // '#f46d43',
  //             // '#fdae61',
  //             // '#fee08b',
  //             // '#ffffbf',
  //             // '#d9ef8b',
  //             // '#a6d96a',
  //             // '#66bd63',
  //             '#1a9850',
  //             // '#006837',
  //           ],
  //         }],
  //       },
  //       options: {
  //         aspectRatio: bounds.width / bounds.height,
  //         indexAxis: 'y',
  //       },
  //     });
  //   }
  // }
// }
