// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
  // https://github.com/mathjax/MathJax/issues/3584
  interface Window {
    MathJax: typeof MathJax;
  }

  // TODO: really dirty approximation of the MathJax API. Just used to remove errors.
  declare const MathJax: {
    loader?: {
      load?: string[],
      paths?: {[name: string]: string},
      svg?: {[name: string]: string},
    },
    startup?: {
      promise: Promise<void>,
      adaptor: {
        serializeXML(svg: any): string,
        tags(node: any, kind: string): any[];
        append(parent: any, child: any): any;
        removeAttribute(parent: any, attribute: string): any;
        setAttribute(parent: any, attribute: string, value: string): any;
        text(parent: any): any;
        node(kind: string, a: any, b: any, c: any): any;
        create(kind: string);
      }
    },
    tex2svgPromise?(tex: string, options: any): Promise<any>,
  };
}

export {};
