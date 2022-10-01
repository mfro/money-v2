declare module "pdf2json" {
  export default class {
    constructor();

    on(e: 'pdfParser_dataReady', callback: (v: PDF) => void): void;

    parseBuffer(buffer: Buffer): void;
  }

  interface PDF {
    Pages: Page[];
  }

  interface Page {
    Texts: Text[];
  }

  interface Text {
    x: number;
    y: number;
    w: number;
    sw: number;
    A: string;
    R: TextRun[];
    oc: unknown;
  }

  interface TextRun {
    T: string;
    S: unknown;
    TS: unknown;
  }
}
