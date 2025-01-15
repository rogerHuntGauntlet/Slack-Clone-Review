declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: any;
    metadata: any;
    version: string;
  }

  function pdf(dataBuffer: Buffer | Uint8Array): Promise<PDFData>;
  export = pdf;
}

declare module 'mammoth' {
  interface ExtractResult {
    value: string;
    messages: Array<any>;
  }

  interface Options {
    path?: string;
    buffer?: Buffer;
    arrayBuffer?: ArrayBuffer;
  }

  export function extractRawText(options: Options): Promise<ExtractResult>;
} 