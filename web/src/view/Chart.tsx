import { Chart, registerables } from 'chart.js';
import { defineComponent, h, inject, Ref, shallowRef, toRef, watchEffect } from 'vue';
import { assert } from '@mfro/assert';
import { MoneyContext, Transaction } from '@/store';

Chart.register(...registerables);

export interface Graph {
  type: GraphType;
  canvas: HTMLCanvasElement | null;
}

export type GraphType = 'tag' | 'month' | 'day';

export default defineComponent({
  props: {
    transactions: Array,
  },

  setup(props) {
    const context = inject('context');
    const transactions = toRef(props, 'transactions') as Ref<Transaction[]>;

    const canvas = shallowRef<null | HTMLCanvasElement>(null);

    let chart: Chart;

    watchEffect(render, { flush: 'post' });
    function render() {
      chart?.destroy();

      if (!canvas.value) return;

      const bounds = canvas.value.getBoundingClientRect()
      const context = canvas.value.getContext('2d');
      assert(context != null, 'context');

      const months = new Map<string, { date: Date, value: number }>();

      for (const t of transactions.value) {
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

      const labels = src.map(v => v[0]);
      const data = src.map(v => v[1].value / 100);

      chart = new Chart(context, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'money',
            data,
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
          indexAxis: 'y',
        },
      });
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
