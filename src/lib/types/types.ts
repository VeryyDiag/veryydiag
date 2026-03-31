// File containing most of the types

// A SVG file contains the node it represents, and it directly contains information about inputs, outputs… via data attribute
// (easy to add in inkscape by selecting the node via Edit > XML Editor). In the following we describe only inputs, but outputs are
// exactly identical except that 'input' is replaced with 'output'. Similarly 'inoutput' is used for nodes that can be treated as both inputs or outputs (this is done ZX-calculus where processes can be represented as undirected graphs).
// - each input node should have a data-cryptodiag-input="X" where X is an integer uniquely representing the name of the input, this number being used also when ordering inputs.
// - data-cryptodiag-input-name="My informal name" gives an informal name on the content of the input
// - data-cryptodiag-input-multi="{no,sorted,unsorted}" tells if we can connect multiple wires to this input (no, default), and if so if multiple outputs must be sorted or if only connectivity matters (unsorted). In our framework, inputs will typically be unsorted (wait until all input arrive) while outputs will be sorted (we activate them based on their ordering).
// - data-cryptodiag-input-type=
// - data-cryptodiag-input-type=

export type Point = {
  x: number,
  y: number,
}
                   
export type AvailableNode = {
  svgString?: string, // You can either specify the SVG directly in the YML file…
  svgName?: string, // … or specify a name of a SVG …
  componentName?: string, // … or the name of a svelte component: by default we use the NodeGeneric component that should cover most cases (if not all, at least we try to make it really generic) …
  // TODO: … or specify the URL of a SVG file
}

export type Node = AvailableNode & { nodeKind: string, pos: Point }

// Dots are forbiden in NodeID
export type NodeID = string
export type AnchorName = string
/** NodeID . AnchorName, see IDAnchorToFullAnchor and fullAnchorToIDAndAnchor */
export type IDAnchor = string

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

export type LinkID = string

export type Link = {
  from: IDAnchor,
  to: IDAnchor,
  /** Optional ID selected by the user (temporarily ID selected by this software will starts with : and may not be saved
   * as it is used only internally to remove/select/… links easily) */
  id?: string
}

export type Error = {
  message: string,
}

/** Foo */
export type DiagramConf = {
  /** Dictionary containing all nodes in a graph (id: node) */
  diagramNodes?: Record<NodeID, Node>,
  /**
   * Dictionary containing all possible nodes that can be used in a graph (nodeKind: available node)
   */
  availableNodes?: Record<string, AvailableNode>,
  viewport?: Viewport,
  svgSize?: SvgSize,
  links?: Record<LinkID, Link>,
}

/** Configuration given by the user that is more permissive (e.g. links don't require ID) */
export type DiagramConfByUser = Omit<DiagramConf, "links"> & { links?: Link[] }
