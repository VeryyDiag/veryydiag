// File containing most of the types

export interface NodeDiscard {
  nodeKind: "NodeDiscard",
}

export type Node = NodeDiscard

export type NodeNames = "nodeDiscard"

export const nameToComponent = { NodeDiscard }
