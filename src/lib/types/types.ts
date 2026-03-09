// File containing most of the types

export interface NodeDiscard {
  nodeKind: "NodeDiscard",
}

// A SVG file contains the node it represents, and it directly contains information about inputs, outputs… via data attribute
// (easy to add in inkscape by selecting the node via Edit > XML Editor). In the following we describe only inputs, but outputs are
// exactly identical except that 'input' is replaced with 'output'. Similarly 'inoutput' is used for nodes that can be treated as both inputs or outputs (this is done ZX-calculus where processes can be represented as undirected graphs).
// - each input node should have a data-secudiag-input="X" where X is an integer uniquely representing the name of the input, this number being used also when ordering inputs.
// - data-secudiag-input-name="My informal name" gives an informal name on the content of the input
// - data-secudiag-input-multi="{no,sorted,unsorted}" tells if we can connect multiple wires to this input (no, default), and if so if multiple outputs must be sorted or if only connectivity matters (unsorted). In our framework, inputs will typically be unsorted (wait until all input arrive) while outputs will be sorted (we activate them based on their ordering).
// - data-secudiag-input-type=
// - data-secudiag-input-type=
export interface NodeCustom {
  nodeKind: "NodeCustom",
  // Specify either the svg string or svgName
  svgString: string | undefined,
  svgName: string | undefined,
  pos: {x: number, y: number},
}


export type NodeNames = "nodeDiscard"

export type Pos = {
  x: number,
  y: number
}

export type Node = NodeCustom | NodeDiscard
                   
export type AvailableNode = {
  name: string,
  svgString?: string
}

export type DiagramConf = {
  diagramNodes?: [Node],
  availableNodes?: [AvailableNode],
  viewport?: {x: number, y: number, w: number, h: number}
}
