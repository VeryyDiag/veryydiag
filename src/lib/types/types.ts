// File containing most of the types

export interface NodeDiscard {
  nodeKind: "NodeDiscard",
}

export interface NodeCustom {
  nodeKind: "NodeCustom",
  svg: string | undefined,
  svgName: string | undefined,
}


export type Node = NodeDiscard

export type NodeNames = "nodeDiscard"

export const nameToComponent = { NodeDiscard }
