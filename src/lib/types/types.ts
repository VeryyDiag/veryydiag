// File containing most of the types and some helper to translate from one type to another

import { assertNotUndefined, randomID, toString } from '$lib/utils.svelte';

// A SVG file contains the node it represents, and it directly contains information about inputs, outputs… via data attribute
// (easy to add in inkscape by selecting the node via Edit > XML Editor). In the following we describe only inputs, but outputs are
// exactly identical except that 'input' is replaced with 'output'. Similarly 'inoutput' is used for nodes that can be treated as both inputs or outputs (this is done ZX-calculus where processes can be represented as undirected graphs).
// - each input node should have a data-proofdiag-input="X" where X is an integer uniquely representing the name of the input, this number being used also when ordering inputs.
// - data-proofdiag-input-name="My informal name" gives an informal name on the content of the input
// - data-proofdiag-input-multi="{no,sorted,unsorted}" tells if we can connect multiple wires to this input (no, default), and if so if multiple outputs must be sorted or if only connectivity matters (unsorted). In our framework, inputs will typically be unsorted (wait until all input arrive) while outputs will be sorted (we activate them based on their ordering).
// - data-proofdiag-input-type=
// - data-proofdiag-input-type=

export type Point = {
  x: number,
  y: number,
}

/** Parameters of a node, like the name of a box… */
export type ParamName = string
/** Parameter specification */
export const paramAvailableTypes = ["integer", "string", "boolean"]
export type ParamSpec = {
  type: typeof paramAvailableTypes[number],
  default: number | string,
  /** If unique is true, we forbid diagrams with the same value appearing twice (used mostly to uniquely
   *  identify diagram outputs). If not specified, assumed to be false.
   */
  unique?: boolean,
}
export type ParamValue = number | string | boolean
/** Parameter instantiation */
export type Param = {
  value: ParamValue
}

export type AnchorProps = {
}

export type ParamSpecs = Record<ParamName, ParamSpec>
export type Params = Record<ParamName, Param>
export type AvailableNode = {
  svgString?: string, // You can either specify the SVG directly in the YML file…
  svgName?: string, // … or specify a name of a SVG … or don't provide anything except for anchors (but this can't be shown in the GUI for now, still useful when considering CLI/tests)
  /**
   * Anchors provided by the node.
   * They are typically automatically derived from the SVG file when importing it, but we also
   * add them here to avoid XML parsing when verifying the proof and have a self-contained Yaml
   * file that we may certify using other tools that may not allow easy XML parsing (Rocq…).
   * It also provide some robustness, as we can use it to detect when the SVG file changed.
   */
  anchors?: Record<AnchorName, AnchorProps>,
  componentName?: string, // … or the name of a svelte component: by default we use the NodeGeneric component that should cover most cases (if not all, at least we try to make it really generic) …
  /** Parameters that characterize the node. They are often extracted from the svg itself,
   *  but we can override them here, e.g. to make it easier to parse
   */
  paramSpecs?: ParamSpecs,
  params?: Params,
  /** Value given to the parameters */
  // TODO: … or specify the URL of a SVG file
}

export function getParam(node: Node, theory: Theory, paramName: ParamName) : ParamValue | undefined {
  if (node?.params?.[paramName] !== undefined) {
    return node.params[paramName].value
  } else {
    return theory?.availableNodes?.[node?.nodeKind]?.paramSpecs?.[paramName]?.default
  }
}

// TODO: actually we always specify a nodeKind and don't care about most props of Available nodes
// as we always fetch them from the theory itself.
// So remove them from the definition of Node.
export type Node = AvailableNode & { nodeKind: string, pos?: Point }

// Dots are forbiden in NodeID
export type NodeID = string
export type NodeKind = string
/** A boundary name is the param 'name' given to a boundary node */
export type BoundaryName = string

export type AnchorName = string
/** NodeID . AnchorName, see IDAnchorToFullAnchor and fullAnchorToIDAndAnchor */
export type IDAnchor = string
export type TheoryID = string

/** Special kind of nodes used to describe connectivity with the outside world */
export const nodeKindBoundaries : NodeKind[] = [ "diagramBoundary" ]

export function nodeFromNodeID(nodeID: NodeID, diagram: Diagram) : Node {
  return assertNotUndefined(diagram?.nodes?.[nodeID], `The node ${nodeID} does not exist`)
}

export function linkFromNodeID(linkID: LinkID, diagram: Diagram) : Link {
  return assertNotUndefined(diagram?.linksWithID?.[linkID], `The link ${linkID} does not exist`)
}

export function isBoundaryNode(nodeID: NodeID, diagram: Diagram) {
  const nodeKind = assertNotUndefined(nodeFromNodeID(nodeID, diagram)?.nodeKind, `The node ${nodeID} has no nodeKind`)
  return nodeKindBoundaries.includes(nodeKind)
}

// See also getBoundaryName if you don't want to throw an error
export function getBoundaryNameFromNode(nodeID: NodeID, diagram: Diagram, theory: Theory) : BoundaryName {
  const node = diagram?.nodes?.[nodeID]
  if (node === undefined) {
    throw new Error(`The node ${nodeID} does not exist in the diagram`)
  }
  const boundaryName = getParam(node, theory, "boundaryName")
  if (boundaryName === undefined) {
    throw new Error(`The parameter boundaryName does not exist in ${nodeID}, i.e. it is not a boundary node`)
  }
  return toString(boundaryName)
}


export function getBoundaryName(node: Node, theory: Theory) : string | undefined {
  const p = getParam(node, theory, "boundaryName")
  if (p === undefined) {
    return undefined
  } else {
    return toString(p)
  }
}

export type NbBoundaryLink = 0|1|2|3

/** Returns the identity of boundary links, 0 = not a boundary link, 1 = from is boundary, not to,
 * 2 = to is boundary, not from, 3 = both are boundary nodes.
 */
export function nbBoundaryLink(linkID: LinkID, diagram: Diagram, theory: Theory) : NbBoundaryLink {
  const nodeFrom = assertNotUndefined(linkFromNodeID(linkID, diagram)?.from, `The link ${linkID} has no "from"`)
  const nodeTo = assertNotUndefined(linkFromNodeID(linkID, diagram)?.from, `The link ${linkID} has no "from"`)
  // To help typescript we don't use sum
  const a = isBoundaryNode(nodeFrom, diagram)
  const b = isBoundaryNode(nodeTo, diagram)
  if (!a && !b) {
    return 0
  } else if (a && !b) {
    return 1
  } else if (b && !a) {
    return 2
  } else {
    return 3
  }
}


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

/** Rules */

export type RuleName = string
export type Rule = {
  /** Might be undefined when creating the rule */
  lhs?: Diagram,
  rhs?: Diagram,
}

/** Maps a node ID in the rule to a node ID in the diagram */
export type NodeBijection = Record<NodeID, NodeID>
/** Maps a link ID in the rule to a link ID in the diagram */
export type LinkBijection = Record<LinkID, LinkID>
/** Maps a link in a diagram to its boundary name in the rule. Since a link may have each
 *  end on a boundary (e.g. ZX ID rule -- = -o-), we need to specify the from/to parts.
 *  In this specific case (possible only when the boundary accepts a single link), we
 *  may not preserve the number of links since we basically cut a link in two parts (->)
 *  or we merge two links in one (<-). In the first case, the new link will have the name
 *  of the link connected to the lexicographically smaller boundary name (ascii comparison,
 *  I tried it's trivial to compute also in Rocq). In the split case, the name is given
 *  via newLinkName{1,2} as documented below.
 *  One may also have similar rules like -- = -- when the kind of the link is changed etc.
 */
export type BoundaryLinks = Record<LinkID, {
  from?: BoundaryName,
  to?: BoundaryName,
  /** Only when both 'from' and 'to' are specified and the link is split in two parts in the rule.
   *  Name of the first created link (sharing the 'from' anchor). If you don't know if the rule will
   *  split the link or not, you can always specify it and it will be ignored if needed.
   */
  newLinkName1?: LinkID,
  /** Only when both 'from' and 'to' are specified and the link is split in two parts in the rule.
   *  Name of the second created link (sharing the 'to' anchor). If you don't know if the rule will
   *  split the link or not, you can always specify it and it will be ignored if needed.
   */
  newLinkName2?: LinkID,
} >

export type ProofStep = {
  ruleName: RuleName,
  /** Specify if we apply the rule from left to right, or right to left */
  direction: "lr" | "rl",
  /**
   * To know how to apply the rule precisely, we should specify how to map each node of the diagram to
   * its corresponding node in the rule. This mapping may automatically be determined when possible,
   * e.g. by the javascript code, but this is done only once (more efficient + always works).
   * Here, we map nodes in the left diagram to  "from" rule to nodes in the original graph.
   * Note that here we do not specify the boundary nodes.
   * We do it this direction in case we introduce special kinds of nodes in rules like "arbitrary graph" that can
   * be attributed to multiple nodes and to maintain same direction as boundaryLinks.
   */
  nodeBijectionAB: NodeBijection,
  /** Same for links */
  linkBijectionAB: LinkBijection,
  /** We also associate to each boundary link in the diagram its correspondant boundary name
   *  in the rule (specified via its boundary name). This can sometimes be inferred
   *  automatically, but sometimes not in a non-ambiguous way (e.g. two boundary nodes
   *  connected to the same node in the zx copy rule) hence we include it here.
   */
  boundaryLinksDR: BoundaryLinks,
  /** Similarly, we maintain a map "node in 'to' rule" -> "node in final diagram".
   *  We can't just take the name in the new rule as we may have name collision.
   *  We also ignore boundary links which are taken care by boundaryLinksDiagDR
   */
  nodeBijectionCD: Record<NodeID, NodeID>,
  /** Same for links */
  linkBijectionCD: Record<LinkID, LinkID>,
}

/** Theory contains nodes and rules we can apply on the nodes */
export type Theory = {
  theoryName?: string,
  availableNodes?: Record<NodeKind, AvailableNode>,
  rules?: Record<RuleName, Rule>,
}

/** Structure representing a diagram tab */
export type DiagramID = string
export type Diagram = {
  diagramName?: string,
  nodes?: Record<NodeID, Node>,
  /** Links (we turn links (easier to write) into linksWithID when loading the file for efficiency reasons) */
  linksWithID?: Record<LinkID, Link>,
  /** Links (we don't require IDs for these links as it is easier to write, but less efficient so we turn them into linksWithID when loading them) */
  links?: Link[],
  viewport?: Viewport,
  /** Size of the svg when exported as standalone image. */
  svgSize?: SvgSize,
  /** List of nodes/rewritting rules to use. If not specified, defaults to "main" */
  theory?: TheoryID,
}

/** Configuration stored internally */
export type DiagramConf = {
  /** Stores all diagrams contained in the current file. */
  diagrams: Record<DiagramID, Diagram>,
  /** Sorts them to show them in tabs. We don't simply use a list in diagrams for efficiently reasons */
  diagramTabs: DiagramID[],
  /** Diagram currently under edit */
  currentDiagramTab: DiagramID,
  /** A theory is a list of nodes and rules. We allow multiple theories in the same file. */
  theories: Record<TheoryID, Theory>,
}


/** Configuration given by the user that is more permissive (e.g. links don't require ID). See diagramConfToDiagramConfByUser */
export type DiagramConfByUser = {
  /** Stores all diagrams contained in the current file. */
  diagrams?: Record<DiagramID, Diagram>,
  /** Sorts them to show them in tabs. We don't simply use a list in diagrams for efficiently reasons.
   * If unspecified, this is equivalent to ["main"]
   */
  diagramTabs?: DiagramID[],
  /** Diagram currently under edit. If unspecified, equals to "main" */
  currentDiagramTab?: DiagramID,
  /** A theory is a list of nodes and rules. We allow multiple theories in the same file. */
  theories?: Record<TheoryID, Theory>,
  /** These are shortcuts to quickly specify the "main" diagram without creating a new tab etc
   * (also helps with backward compatibility)
   */
  diagramNodes?: Record<NodeID, Node>,
  /** These are shortcuts for the "main" theory, when we are too lazy to define tabs… */
  availableNodes?: Record<NodeID, AvailableNode>,
  /** These are shortcuts for the "main" links, when we are too lazy to define tabs… */
  links?: Link[],
  /** These are shortcuts for the "main" linksWithID, when we are too lazy to define tabs… */
  linksWithID?: Record<LinkID, Link>,
  /** Shortcuts for the "main" Viewport, when we are too lazy to define tabs… */
  viewport?: Viewport,
  /** Shortcuts for the "main" Viewport, when we are too lazy to define tabs… */
  svgSize?: SvgSize,
}


export type NotificationKind = "error" | "info" | "warning"
export type Notification = {
  kind: NotificationKind,
  message: string
}

// ========== Conversion between types ==========

// TODO: make sure that this preserves better the text typed by users (e.g. remove links when not needed etc)
export function diagramConfToDiagramConfByUser(diagramConf: DiagramConf) : DiagramConfByUser {
  return diagramConf
}

export function diagramConfByUserToDiagramConf(diagramConfByUser: DiagramConfByUser) : DiagramConf {
  if (diagramConfByUser?.diagramNodes && diagramConfByUser?.diagrams?.main) {
    throw new Error("The diagram has two main nodes (diagramNodes and via diagrams.main)")
  }
  if (diagramConfByUser?.links && diagramConfByUser?.diagrams?.main) {
    throw new Error("The diagram has two main nodes (links and via diagrams.main)")
  }
  if (diagramConfByUser?.viewport && diagramConfByUser?.diagrams?.main) {
    throw new Error("The diagram has two main nodes (viewport and via diagrams.main)")
  }
  if (diagramConfByUser?.svgSize && diagramConfByUser?.diagrams?.main) {
    throw new Error("The diagram has two main nodes (svgSize and via diagrams.main)")
  }
  if (diagramConfByUser?.linksWithID && diagramConfByUser?.diagrams?.main) {
    throw new Error("The diagram has two main nodes (linksWithID and via diagrams.main)")
  }
  if (diagramConfByUser?.availableNodes && diagramConfByUser?.theories?.main) {
    throw new Error("The diagram has two main theories (availableNodes and via theories.main)")
  }

  const {
    diagrams = {},
    diagramTabs = [ "main" ],
    currentDiagramTab = "main",
    theories = {},
    diagramNodes,
    availableNodes,
    links,
    linksWithID,
    viewport,
    svgSize,
  } = diagramConfByUser
  const diagramsPreCleared : Record<DiagramID, Diagram> = (diagramNodes === undefined && links === undefined && viewport === undefined && svgSize === undefined) ? diagrams : {...diagrams, main: {
    diagramName: "Main diagram",
    nodes: diagramNodes || {},
    links: links || [],
    linksWithID: linksWithID || {},
    viewport: viewport || {x: 0, y: 0, w: 20, h: 20},
    svgSize: svgSize,
    theory: "main"
  }}
  const clearDiagram = (diagID: DiagramID, {links, linksWithID, viewport, ...rest}: Diagram) : Diagram => {
    // Check if IDs are unique
    const ids = (links || []).map(v => v?.id).filter((id) => id !== undefined)
    const duplicates = ids.filter((e, i, a) => a.indexOf(e) !== i)
    if (duplicates.length > 0) {
      throw new Error(`When importing the configuration we found multiple links with duplicated IDs: ${duplicates} in the diagram ${diagID}`)
    }
    return {
      ...rest,
      linksWithID: {
        ...(linksWithID || {}),
        ...(Object.fromEntries((links || []).map((link) => [link?.id || `:${randomID()}`, link])))
      },
      viewport: viewport || {x: 0, y: 0, w: 20, h: 20}
    }
  }
  const diagCleared = Object.fromEntries(Object.entries(diagramsPreCleared).map(([k,diag]) => ([k, clearDiagram(k, diag)])))

  const cleanedConfig = {
    // We must have at least one diagram or the interface would crash
    diagrams: (Object.keys(diagCleared).length > 0) ? diagCleared : {
      main: {
        diagramName: "Main diagram",
        nodes: {},
        linksWithID: {},
        theory: "main"
      },
    },
    diagramTabs: diagramTabs || [ "main" ],
    currentDiagramTab: currentDiagramTab || "main",
    theories: (availableNodes !== undefined || Object.keys(theories).length === 0) ? {...theories, main: {
      theoryName: "Main theory",
      availableNodes: availableNodes,
    }} : theories,
  }

  // Check if all tabs are well defined
  if (cleanedConfig.diagrams?.[cleanedConfig.currentDiagramTab] === undefined) {
    throw new Error(`The diagram '${cleanedConfig.currentDiagramTab}' set as current tab does not exist (${Object.keys(cleanedConfig.diagrams).length > 1 ? Object.keys(cleanedConfig.diagrams) : "no diagram available"}).`)
  }

  cleanedConfig.diagramTabs.forEach((tab) => {
    if (cleanedConfig.diagrams?.[tab] === undefined) {
      throw new Error(`The diagram ${cleanedConfig.currentDiagramTab} set in the list of tabs does not exist.`)
    }
  })

  Object.entries(cleanedConfig.diagrams).forEach(([diagID, diag]) => {
    if (cleanedConfig.theories?.[diag?.theory || "main"] === undefined) {
      throw new Error(`The diagram ${diagID} relies on a theory ${diag.theory} that does not exist in the list of theories.`)
    }
  })

  // Check if all nodes have available theories
  return cleanedConfig
}


export function extractNodeParamSpecsFromSVG(svg: string): ParamSpecs {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svg, "image/svg+xml")
  // Not possible to use CSS selectors because of the (mandatory) namespace…
  // We can only select elements irrespective of their namespace via CSS selectors.
  // https://stackoverflow.com/a/23047888/4987648
  const allElements = doc.getElementsByTagNameNS("proofdiag", "newparam")
  return Object.fromEntries([...allElements].map(elt => {
    const name = elt.getAttribute("name")
    const type = elt.getAttribute("type")
    const def = elt.getAttribute("default")
    const unique = elt.getAttribute("unique")
    if (name === null) {
      throw new Error(`No 'name' field was provided when creating a new parameter in the SVG file.`)
    }
    if (type === null) {
      throw new Error(`No 'type' field was provided for the param '${name}'`)
    }
    if (def === null) {
      throw new Error(`No 'def' field was provided for the param '${name}'`)
    }
    if (!(paramAvailableTypes.includes(type))) {
      throw new Error(`In the ${name} param definition, the type ${type} is not a valid type (${JSON.stringify(paramAvailableTypes)}).`)
    }
    if (type === "integer" && def !== null && isNaN(parseFloat(def))) {
      throw new Error(`The type is int but the default value ${def} can't be turned into a def.`)
    }
    if (type === "boolean" && !["true", "false"].includes(def)) {
      throw new Error(`The type is boolean but the default value (${def}) is not true/false.`)
    }
    if (unique !== null && !["true", "false"].includes(unique)) {
      throw new Error(`In the definition of the ${name} parameter, the unique field must be true.`)
    }
    return [
      name,
      {
        ...(unique !== null && unique === "true" && {unique: true}),
        type,
        default: def,
      }
    ]
  }))
}
