import { createApp, h } from 'vue'
import { framework } from '@mfro/vue-ui';

import App from './view/App.vue';
import type * as pdfjson from 'pdfjs-dist';
import { assert } from '@mfro/assert';

import { importPNC } from './import/pnc';

const pdfjs: typeof pdfjson = (window as any).pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.js';

const app = createApp({
  render: () => h(App),
});

app.config.unwrapInjectedRef = true;

app.use(framework);

app.mount('#app');

main();

function wrap(ctx: CanvasRenderingContext2D) {
  const dpi = 96.0;
  const gridXPerInch = 4.0;
  const gridYPerInch = 4.0;

  const _pixelXPerGrid = dpi / gridXPerInch;
  const _pixelYPerGrid = dpi / gridYPerInch;
  const _pixelPerPoint = dpi / 72;

  const state = {
    fillStyle: ctx.fillStyle,
    lineCap: ctx.lineCap,
    lineJoin: ctx.lineJoin,
    lineWidth: ctx.lineWidth,
    miterLimit: ctx.miterLimit,
    shadowBlur: ctx.shadowBlur,
    shadowColor: ctx.shadowColor,
    shadowOffsetX: ctx.shadowOffsetX,
    shadowOffsetY: ctx.shadowOffsetY,
    strokeStyle: ctx.strokeStyle,
    globalAlpha: ctx.globalAlpha,
    arcScaleX_: 1,
    arcScaleY_: 1,
    lineScale_: 1,
    dashArray: false,
  };

  let matrix = createMatrixIdentity();

  const stateStack: (typeof state)[] = [];
  const matrixStack: (typeof matrix)[] = [];

  function createMatrixIdentity() {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }

  function matrixMultiply(m1: number[][], m2: number[][]) {
    const result = createMatrixIdentity();

    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        let sum = 0;

        for (let z = 0; z < 3; z++) {
          sum += m1[x][z] * m2[z][y];
        }

        result[x][y] = sum;
      }
    }
    return result;
  }

  function matrixIsFinite(m: number[][]) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 2; k++) {
        if (!isFinite(m[j][k]) || isNaN(m[j][k])) {
          return false;
        }
      }
    }
    return true;
  }

  function setMatrix(ctx: CanvasRenderingContext2D, m: number[][], updateLineScale: boolean) {
    if (!matrixIsFinite(m)) {
      return;
    }
    matrix = m;

    if (updateLineScale) {
      // Get the line scale.
      // Determinant of this.m_ means how much the area is enlarged by the
      // transformation. So its square root can be used as a scale factor
      // for width.
      const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
      state.lineScale_ = Math.sqrt(Math.abs(det));
    }
  }

  function getCoords(x: number, y: number) {
    return {
      x: (x * matrix[0][0] + y * matrix[1][0] + matrix[2][0]),
      y: (x * matrix[0][1] + y * matrix[1][1] + matrix[2][1])
    };
  }


  function toFixedFloat(n: number) {
    return parseFloat(n.toFixed(3));
  }

  function toFormX(x: number) {
    return toFixedFloat(x / _pixelXPerGrid);
  }

  function toFormY(y: number) {
    return toFixedFloat(y / _pixelYPerGrid);
  }

  ctx.save = function () {
    stateStack.push({ ...state });
    matrixStack.push(matrix);

    matrix = matrixMultiply(createMatrixIdentity(), matrix);
  };

  ctx.restore = function () {
    Object.assign(state, stateStack.pop());
    matrix = matrixStack.pop()!;
  };

  ctx.translate = function (aX, aY) {
    const m1 = [
      [1, 0, 0],
      [0, 1, 0],
      [aX, aY, 1]
    ];

    setMatrix(this, matrixMultiply(m1, matrix), false);
  };

  ctx.rotate = function (aRot) {
    const c = Math.cos(aRot);
    const s = Math.sin(aRot);

    const m1 = [
      [c, s, 0],
      [-s, c, 0],
      [0, 0, 1]
    ];

    setMatrix(this, matrixMultiply(m1, matrix), false);
  };

  ctx.scale = function (aX, aY) {
    state.arcScaleX_ *= aX;
    state.arcScaleY_ *= aY;

    const m1 = [
      [aX, 0, 0],
      [0, aY, 0],
      [0, 0, 1]
    ];

    setMatrix(this, matrixMultiply(m1, matrix), true);
  };

  ctx.transform = function (m11, m12, m21, m22, dx, dy) {
    const m1 = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx, dy, 1]
    ];

    setMatrix(this, matrixMultiply(m1, matrix), true);
  };

  ctx.setTransform = function (...args: [number, number, number, number, number, number] | [DOMMatrix2DInit?]) {
    assert(args.length == 6, 'setTransform');

    const [m11, m12, m21, m22, dx, dy] = args;

    const m = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx, dy, 1]
    ];

    setMatrix(this, m, true);
  };

  ctx.fillText = function (text, x, y, maxWidth?) {
    if (!text || text.trim().length == 0)
      return;

    const p = getCoords(x, y);

    console.log(`text ${p.x} ${p.y} ${text}`);
    debugger;
  };

  ctx.strokeText = function (text, x, y, maxWidth?) {
    if (!text || text.trim().length == 0)
      return;

    const p = getCoords(x, y);

    console.log(`text ${p.x} ${p.y} ${text}`);
  };
}

async function main() {
  importPNC();
}
