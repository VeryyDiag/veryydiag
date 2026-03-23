// File containing most of the types

// A SVG file contains the node it represents, and it directly contains information about inputs, outputs… via data attribute
// (easy to add in inkscape by selecting the node via Edit > XML Editor). In the following we describe only inputs, but outputs are
// exactly identical except that 'input' is replaced with 'output'. Similarly 'inoutput' is used for nodes that can be treated as both inputs or outputs (this is done ZX-calculus where processes can be represented as undirected graphs).
// - each input node should have a data-secudiag-input="X" where X is an integer uniquely representing the name of the input, this number being used also when ordering inputs.
// - data-secudiag-input-name="My informal name" gives an informal name on the content of the input
// - data-secudiag-input-multi="{no,sorted,unsorted}" tells if we can connect multiple wires to this input (no, default), and if so if multiple outputs must be sorted or if only connectivity matters (unsorted). In our framework, inputs will typically be unsorted (wait until all input arrive) while outputs will be sorted (we activate them based on their ordering).
// - data-secudiag-input-type=
// - data-secudiag-input-type=

export type Point = {
  x: number,
  y: number,
}
                   
export type AvailableNode = {
  nodeKind: string,
  svgString?: string, // You can either specify the SVG directly in the YML file…
  svgName?: string, // … or specify a name of a SVG …
  componentName?: string, // … or the name of a svelte component: by default we use the NodeGeneric component that should cover most cases (if not all, at least we try to make it really generic) …
  // TODO: … or specify the URL of a SVG file
}

export type Node = AvailableNode & {pos: Point, id: string}

export type Viewport = {
  x: number
  y: number
  w: number
  h: number
}

export type SvgSize = {
  w: string
  h: string
}

/** Foo */
export type DiagramConf = {
  /** Bar */
  diagramNodes?: Node[],
  availableNodes?: AvailableNode[],
  viewport?: Viewport,
  svgSize?: SvgSize,
}
