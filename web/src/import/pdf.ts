import type * as pdfjson from 'pdfjs-dist';

const pdfjs: typeof pdfjson = (window as any).pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.js';

export interface Text {
  x: number;
  y: number;
  value: string;
}

export async function parsePDF(raw: ArrayBuffer) {
  type State = ReturnType<typeof defaultState>;
  const defaultState = () => ({
    matrix: identity,
    textMatrix: identity,
    textMatrixScale: 0,
    charSpacing: 0,
    wordSpacing: 0,
    x: 0,
    y: 0,
    lineX: 0,
    lineY: 0,
  });

  type Matrix = [number, number, number, number, number, number];
  const identity: Matrix = [1, 0, 0, 1, 0, 0];

  const pdf = await pdfjs.getDocument(raw).promise;

  function mult(a: Matrix, b: Matrix): Matrix {
    return [
      a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3],
      a[1] * b[3] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
    ];
  }

  function coords(state: State, x: number = state.x, y: number = state.y) {
    const m = mult(state.matrix, state.textMatrix);
    return {
      x: (x * m[0] + y * m[2] + m[4]),
      y: (x * m[1] + y * m[3] + m[5]),
    };
  }

  const pageTexts: Text[][] = [];

  for (let i = 1; i <= pdf.numPages; ++i) {
    const page = await pdf.getPage(i);
    const opList = await page.getOperatorList();

    const viewbox = page.getViewport().viewBox;

    const canvas = document.createElement('canvas');
    // canvas.width = viewbox[2] - viewbox[0];
    // canvas.height = viewbox[3] - viewbox[1];

    const context = canvas.getContext('2d')!;
    // context.translate(viewbox[0], viewbox[3]);
    // context.scale(1, -1);

    let state = defaultState();
    const stack: State[] = [];

    const pageText: Text[] = [];
    pageTexts.push(pageText);

    for (let i = 0; i < opList.fnArray.length; ++i) {
      switch (opList.fnArray[i]) {
        case pdfjs.OPS.beginText:
          state.textMatrix = [1, 0, 0, 1, 0, 0];
          break;

        case pdfjs.OPS.setTextMatrix:
          // console.log(`setTextMatrix`, state.textMatrix, opList.argsArray[i], mult(state.textMatrix, opList.argsArray[i]));
          state.textMatrix = opList.argsArray[i];
          state.textMatrixScale = Math.hypot(state.textMatrix[0], state.textMatrix[1]);

          state.x = state.lineX = 0;
          state.y = state.lineY = 0;
          break;

        case pdfjs.OPS.moveText:
          // console.log(`moveText`, state.textMatrix, state.x, state.y, opList.argsArray[i]);
          state.x = state.lineX += opList.argsArray[i][0];
          state.y = state.lineY += opList.argsArray[i][1];
          break;

        case pdfjs.OPS.transform:
          // console.log(`transform`, state.textMatrix, opList.argsArray[i], mult(state.textMatrix, opList.argsArray[i]));
          state.matrix = mult(state.matrix, opList.argsArray[i]);
          break;

        case pdfjs.OPS.setCharSpacing:
          state.charSpacing = opList.argsArray[i][0];
          break;

        case pdfjs.OPS.setWordSpacing:
          state.wordSpacing = opList.argsArray[i][0];
          break;

        case pdfjs.OPS.save:
          stack.push(state);
          state = defaultState();
          break;

        case pdfjs.OPS.restore:
          state = stack.pop()!;
          break;

        case pdfjs.OPS.beginGroup:
        case pdfjs.OPS.setLeading:
        case pdfjs.OPS.setLeadingMoveText:
        case pdfjs.OPS.nextLine:
          console.warn('TODO:', Object.keys(pdfjs.OPS).find(k => (pdfjs.OPS as any)[k] == opList.fnArray[i]), opList.argsArray[i]);
          break;

        case pdfjs.OPS.showText:
          const [chars] = opList.argsArray[i];
          const string = chars.map((ch: any) => ch.unicode).join('');

          const pos = coords(state);

          // console.log(pos, string);

          // context.save();
          // context.translate(pos.x, pos.y);
          // context.scale(1, -1);
          // context.fillText(string, 0, 0);
          // context.restore();
          state.x += context.measureText(string).width;

          pageText.push({
            x: pos.x - viewbox[0],
            y: viewbox[3] - pos.y,
            value: string,
          });

          break;
      }
    }

    // document.body.appendChild(canvas);
  }

  return pageTexts;
}
