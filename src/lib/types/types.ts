// File containing most of the types and some helper to translate from one type to another

import { assertDontThrow, assertNotUndefined, assertTrue, assertNever, randomID, toString, fullAnchorToIDAndAnchor, assertNotUndefinedNR, keys, entries, toBoolean } from '$lib/utils';


export class ProofDiagError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "Error"
  }
}

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

/** Parameters of a node, like the name of a box…
 *  This is semantically more or less equivalent to allowing another input plugged with a node simulating this type,
 *  but parameters are far less cumbursome (try to write an ascii string as a graph…), and most
 *  importantly it allows nice graphical designs (I do prefer to see "XOR" than a huge graph encoding the string "XOR").
 */
export type ParamName = string
/** Parameter specification */
export const paramAvailableTypes = ["integer", "string", "boolean"]
export type paramAvailableTypesJS = number | string | boolean
export type ParamSpec = {
  type: typeof paramAvailableTypes[number],
  default: paramAvailableTypesJS
  /** If unique is true, we forbid diagrams with the same value appearing twice (used mostly to uniquely
   *  identify diagram outputs). If not specified, assumed to be false.
   */
  unique?: boolean,
}
export type ParamValue = number | string | boolean

export function checkParamType(paramType: paramAvailableTypesJS, value: ParamSpec["default"]) : true {
  assertTrue(
    (typeof value === "string" && paramType === "string")
    || (typeof value === "number" && paramType === "integer")
    || (typeof value === "boolean" && paramType === "boolean"),
    `Expected type ${paramType} but got a non compatible type ${typeof value}`)
  // TODO: finish
  if (typeof value === "number" && paramType === "integer") {
    assertTrue(Number.isInteger(value),
               `${value} is not integer`)
  }
  return true
}

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
export const nodeKindBoundaries : NodeKind[] = [ "boundary" ]

export function nodeFromNodeID(nodeID: NodeID, diagram: Diagram) : Node {
  return assertNotUndefined(diagram?.nodes?.[nodeID], `The node ${nodeID} does not exist`)
}

export function linkFromLinkID(linkID: LinkID, diagram: Diagram) : Link {
  const link = assertNotUndefined(diagram?.linksWithID?.[linkID], `The link ${linkID} does not exist`)
  assertNotUndefined(link?.from, `Link ${linkID} has no 'from' property`)
  assertNotUndefined(link?.to, `Link ${linkID} has no 'to' property`)
  return link
}

export function isBoundaryNode(node: Node) : boolean {
  const nodeKind = assertNotUndefined(node.nodeKind, `The node has no nodeKind`)
  return nodeKindBoundaries.includes(nodeKind)
}

export function isBoundaryNodeID(nodeID: NodeID, diagram: Diagram) : boolean {
  return assertDontThrow(
    () => isBoundaryNode(nodeFromNodeID(nodeID, diagram)),
    `Problem with the node ${nodeID} when checking if it is a boundary node`
  )
}

export function isMonoWireBoundaryNode(node: Node, theory: Theory) : boolean {
  const nodeKind = assertNotUndefined(node.nodeKind, `The node has no nodeKind`)
  const mwa = getParam(node, theory, "multipleWiresAllowed")
  return nodeKindBoundaries.includes(nodeKind) && mwa !== undefined && !toBoolean(mwa)
}

export function isMonoWireBoundaryNodeID(nodeID: NodeID, diagram: Diagram, theory: Theory) : boolean {
  return assertDontThrow(
    () => isMonoWireBoundaryNode(nodeFromNodeID(nodeID, diagram), theory),
    `Problem with the node ${nodeID} when checking if it is a mono-wire boundary node`
  )
}

export function isMultiWireBoundaryNode(node: Node, theory: Theory) : boolean {
  const nodeKind = assertNotUndefined(node.nodeKind, `The node has no nodeKind`)
  const mwa = getParam(node, theory, "multipleWiresAllowed")
  return nodeKindBoundaries.includes(nodeKind) && mwa !== undefined && toBoolean(mwa)
}

export function isMultiWireBoundaryNodeID(nodeID: NodeID, diagram: Diagram, theory: Theory) : boolean {
  return assertDontThrow(
    () => isMultiWireBoundaryNode(nodeFromNodeID(nodeID, diagram), theory),
    `Problem with the node ${nodeID} when checking if it is a multi-wire boundary node`
  )
}


// See also getBoundaryName if you don't want to throw an error. You may also specify full ID + anchor
// instead of NodeID.
export function getBoundaryNameFromNode(nodeID: NodeID, diagram: Diagram, theory: Theory) : BoundaryName {
  const node = diagram?.nodes?.[fullAnchorToIDAndAnchor(nodeID)[0]]
  if (node === undefined) {
    throw new ProofDiagError(`The node ${nodeID} does not exist in the diagram`)
  }
  const boundaryName = getParam(node, theory, "boundaryName")
  if (boundaryName === undefined) {
    if (isBoundaryNodeID(nodeID, diagram)) {
      throw new ProofDiagError(`The parameter boundaryName does not exist in ${nodeID} while it is supposed to be a boundary node (have you forgotten a .value?)`)
    } else {
      throw new ProofDiagError(`The parameter boundaryName does not exist in ${nodeID} (and is anyway not a boundary node)`)
    }
  }
  return toString(boundaryName)
}


export function getBoundaryName(node: Node, theory: Theory) : BoundaryName | undefined {
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
  const nodeFromFull = assertNotUndefined(linkFromLinkID(linkID, diagram)?.from, `The link ${linkID} has no "from"`)
  const [nodeFrom, anchorFrom] = fullAnchorToIDAndAnchor(nodeFromFull)
  const nodeToFull = assertNotUndefined(linkFromLinkID(linkID, diagram)?.to, `The link ${linkID} has no "to"`)
  const [nodeTo, anchorTo] = fullAnchorToIDAndAnchor(nodeToFull)
  // To help typescript we don't use sum
  const a = isBoundaryNodeID(nodeFrom, diagram)
  const b = isBoundaryNodeID(nodeTo, diagram)
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

/** Returns the identity of multi-wire boundary links, 0 = not a boundary link, 1 = from is boundary, not to,
 * 2 = to is boundary, not from, 3 = both are boundary nodes.
 */
export function nbMultiWireBoundaryLink(linkID: LinkID, diagram: Diagram, theory: Theory) : NbBoundaryLink {
  const nodeFromFull = assertNotUndefined(linkFromLinkID(linkID, diagram)?.from, `The link ${linkID} has no "from"`)
  const [nodeFrom, anchorFrom] = fullAnchorToIDAndAnchor(nodeFromFull)
  const nodeToFull = assertNotUndefined(linkFromLinkID(linkID, diagram)?.to, `The link ${linkID} has no "to"`)
  const [nodeTo, anchorTo] = fullAnchorToIDAndAnchor(nodeToFull)
  // To help typescript we don't use sum
  const a = isMultiWireBoundaryNodeID(nodeFrom, diagram, theory)
  const b = isMultiWireBoundaryNodeID(nodeTo, diagram, theory)
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

/** Returns the identity of mono-wire boundary links, 0 = not a boundary link, 1 = from is boundary, not to,
 * 2 = to is boundary, not from, 3 = both are boundary nodes.
 */
export function nbMonoWireBoundaryLink(linkID: LinkID, diagram: Diagram, theory: Theory) : NbBoundaryLink {
  const nodeFromFull = assertNotUndefined(linkFromLinkID(linkID, diagram)?.from, `The link ${linkID} has no "from"`)
  const [nodeFrom, anchorFrom] = fullAnchorToIDAndAnchor(nodeFromFull)
  const nodeToFull = assertNotUndefined(linkFromLinkID(linkID, diagram)?.to, `The link ${linkID} has no "to"`)
  const [nodeTo, anchorTo] = fullAnchorToIDAndAnchor(nodeToFull)
  // To help typescript we don't use sum
  const a = isMonoWireBoundaryNodeID(nodeFrom, diagram, theory)
  const b = isMonoWireBoundaryNodeID(nodeTo, diagram, theory)
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

/** Given a linkID, provides, if the node points to a multi-wire boundary node, the IDAnchor of the other node and the associated boundary name. */
export function IDanchorPointedByMultiWireBoundaryLink(linkID: LinkID, diagram: Diagram, theory: Theory) : [BoundaryName, IDAnchor] | undefined {
  const nbLinks = nbMultiWireBoundaryLink(linkID, diagram, theory)
  if (nbLinks == 1) {
    // from is boundary link
    return [getBoundaryNameFromNode(fullAnchorToIDAndAnchor(linkFromLinkID(linkID, diagram)?.from)[0], diagram, theory),
            linkFromLinkID(linkID, diagram).to]
  } else if (nbLinks == 2) {
    // to is boundary link
    return [getBoundaryNameFromNode(fullAnchorToIDAndAnchor(linkFromLinkID(linkID, diagram)?.to)[0], diagram, theory),
            linkFromLinkID(linkID, diagram).from]
  } else if (nbLinks == 3) {
    throw new ProofDiagError(`Links between two multi-wire boundary nodes are forbidden (no clear semantic)`)
  } else {
    return undefined
  }
}


/** For each IDAnchor, links to all the multi-wire boundary nodes that are connected to them (may be undefined if the list is empty).
 *  You can use it to check if one needs to fix ambiguity for some links. If you want the inverse of this function, see multiWireBoundaryNameToIdAnchor.
 */
export function idAnchorToMultiWireBoundaryName(diagram: Diagram, theory: Theory) : Record<IDAnchor, BoundaryName[]> {
  let r : Record<IDAnchor, BoundaryName[]> = {}
  entries(diagram?.linksWithID).forEach(([linkID, link]) => {
    const x = IDanchorPointedByMultiWireBoundaryLink(linkID, diagram, theory)
    if (x === undefined) {
      return undefined
    }
    const [boundaryName, idAnchor] = x;
    if (r?.[idAnchor] === undefined) {
      r[idAnchor] = []
    }
    r[idAnchor].push(boundaryName)
  })
  return r
}

export function multiWireBoundaryNameToIdAnchor(diagram: Diagram, theory: Theory) : Record<BoundaryName, IDAnchor> {
  return Object.fromEntries(entries(diagram?.linksWithID).map(([linkID, link]) => {
    return IDanchorPointedByMultiWireBoundaryLink(linkID, diagram, theory)
  }).filter(x => x !== undefined))
}

export function equivalentNodes(IDAnchorA: IDAnchor, diagramA: Diagram, IDAnchorB: IDAnchor, diagramB: Diagram, nodeBijectionAB: NodeBijection | undefined = undefined) : true {
  const [nodeA, anchorA] = fullAnchorToIDAndAnchor(IDAnchorA)
  const [nodeB, anchorB] = fullAnchorToIDAndAnchor(IDAnchorB)
  if (nodeBijectionAB !== undefined) {
    // Check if the corresponding links diagram/rule are pointing to the
    // same node (after translation)/anchor
    assertTrue(
      nodeB === nodeBijectionAB?.[nodeA],
      `Different node name (${nodeB} != ${nodeBijectionAB?.[nodeA]} = translation of ${nodeA})`
    )
  }
  // Same anchor?
  assertTrue(
    anchorA === anchorB,
    `Different anchor name ${anchorA} != ${anchorB} (from resp. ${nodeA} and ${nodeB})`
  )
  // Check if they point to a node with the same kind
  assertTrue(
    (diagramA?.nodes?.[nodeA]?.nodeKind !== undefined) &&
    (diagramA?.nodes?.[nodeA]?.nodeKind === diagramB?.nodes?.[nodeB]?.nodeKind),
    `Different node kind (${diagramA?.nodes?.[nodeA]?.nodeKind} != ${diagramB?.nodes?.[nodeB]?.nodeKind}) (from resp. ${nodeA} and ${nodeB})`
  )
  return true
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
/** Maps a node ID + anchor in the rule to a node ID in the diagram */
export type AnchorMap = Record<IDAnchor, IDAnchor>
/** Maps a link ID in the rule to a link ID in the diagram */
export type LinkBijection = Record<LinkID, LinkID>
/** Maps a link in a diagram to its boundary name in the rule. Since a link may have each
 *  end on a boundary (e.g. ZX ID rule -- = -o-), we need to specify the from/to parts.
 *  For instance, {from: Alice} means that the link starts from the boundary Alice.
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

/**
 * Step that describes how to apply a rule to a given diagram. For this, we need to map each node/link
 * that is part of the diagram to rewrite to its corresponding node/link in the diagram. This is
 * basically what this structure describes. This mapping may automatically be determined when possible,
 * e.g. by the javascript code, but this is done only once (more efficient + always works).
 *
 * These mapping are called "nodeBijectionAB" and "linkBijectionAB" for, respectively, node mapping
 * and link mapping:
 * Below (and elsewhere in the code), A refers to the starting diagram, B to the starting rule
 * diagram, C to the resulting rule diagram, and D to the final diagram to obtain. Hence,
 * nodeBijectionAB means that we map stuff from the starting diagram (A) to stuff in the starting
 * rule (B).
 *
 * To keep the semantic clear and simple, we want to have a one-to-one mapping between
 * each node/link in the diagram and its corresponding node/link in the rule (for more generic
 * rules involving recursion like the dash-box or arbitrary graphs, we will make this possible via
 * a different process called specialization that will map a rule into a new rule in 1-to-1
 * correspondance with the diagram so that we can apply this rule… but let's see this later).
 * The idea is that once this matching is done, the application of the rule will be a very simple
 * process (just complicated by the fact that we check if everything is well defined) : we want to
 * remove the node that belong to the starting rule diagram, and replace them by the element that are
 * in the ending rule diagram. The only subtleties concerns node at the "boundary" of the rule:
 * For this we introduce two special nodes in our graph (actually the same with different parameters)
 * that have a "boundary name" to be able to identify them in both ends of the rule.
 * - a "simple" boundary node with a boundary name: think of it as a wildcard node+anchor, that you
 *   use when you mean "a single link is allowed out of this node". More formally this
 *   represents an arbitrary anchor that your graph may connect to. It helps for instance to write
 *   rules like the ZX ID rule that don't care about the identity of the neighbouring node, but that
 *   requires a single connected link. One may connect in the
 *   rule multiple links to it to since it behaves like a regular "node+anchor", to specify for
 *   instance in arithmetic circuits stuff like "A minus A = 0". In the mapping for this node, instead
 *   of mapping the diagram node to this rule node, we map the diagram node ANCHOR to this node, since
 *   we just want to say "this wire is connected to some arbitrary anchor". This explains why
 *   we create an additonal mapping anchorNodeBijectionAB.
 *   When applying the rule, the original node/anchor will of course not be removed, but any link that
 *   is present in the mapping and connected to this node will be removed as usual. The boundary
 *   name will then help to know what should be reconnected to the anchor. Note that in this case
 *   the number of boundary links may not be the same before/after the application of this node as we
 *   may "merge" two boundary nodes like in the ZX ID rule (that would not be expressable with the next
 *   "multiple" boundary node).
 * - a multi-wire boundary node with a boundary name: such node is attached to a single anchor in
 *   the rule, and species that we don't care about what may be attached to this anchor, including
 *   many links, so we use it to mean "many links may be connected to this anchor", or equivalently
 *   think of it as a pointer to an open anchor. For instance it would be used to represent the ZX
 *   spider fusion rule as:
 *     (multi-wire boundary A) -- spider -- spider -- (multi-wire boundary B)
 *   = (multi-wire boundary B) -- spider -- (multi-wire boundary B)
 *   Here in term of matching, we don't need to map anything but the node already specified in
 *   the matching, since all links not connected to the spiders are anyway preserved. They will
 *   simply be remapped so that they connect to the new node as specified by the boundary name
 *   of the final rule diagram. Hence, we forbid to connect multiple links to a single multi-wire
 *   boundary, but we allow one or zero links to be connected (zero means that we remove them).
 *   There is just one case where this is ambiguous: if several multi-wire boundaries are
 *   connected to the same anchor as shown in the above spider fusion rule, we don't know how to
 *   "split" the links to reconnect them in different places. That's something quite impossible to
 *   avoid (and necessary) so we solve this case by introducing ambiguityBoundaryLinks.
 *   This maps a boundary link in the original diagram to a boundary name in the new diagram.
 *   The nice thing is that this is not even required to fix this ambiguity during the matching, we
 *   can fix it later and it is very easy to detect as well.
 * After replacing the new rule diagram in the original diagram, there may be name collision, hence
 * we additionnally require mappings from all nodes/links (via nodeBijectionCD/linkBijectionCD)
 * to their new name in the diagram. Boundary nodes are not included in this mapping as they
 * keep their old names.
 */
export type ProofStepApplyRule = {
  /** Kind of proof step */
  kind: "applyRule",
  ruleName: RuleName,
  /** Optional string to describe what we are doing in this step */
  description?: string,
  /** Specify if we apply the rule from left to right, or right to left */
  direction: "lr" | "rl",
  /**
   * Map diagram node to rule node.
   * More details in the doc of the structure.
   */
  nodeBijectionAB?: NodeBijection,
  /**
   * Map mono-wire boundary node to a diagram node anchor.
   * We need this to be in this direction because the same anchor in the diagram may map to different simple boundary nodes.
   * Condider for instance two nodes A and B with a single anchor and the rule * -- B -- *
   * that you want to match on the diagram A === B (= being double connection).
   * Also, we map anchors to anchors and not node to anchor because later we may consider wildcard nodes with multiple anchors… who knows.
   * + it's also a bit more logical to map elements with same type.
   * Note that one mono-wire boundary = one DIFFERENT link (otherwise we could end-up with graphs with
   * no node but one looping wire on itself (= not well defined) by applying the ZX ID rule on
   * a diagram with one loop on a Z spider), but possibly the same anchor whose
   * node is DIFFERENT than the other present (non mono-wire boundary) nodes in the diagram
   * (without this restriction a wire may map to a mono-wire & multi-wire leading to inconsistent
   * behaviors if the rule treats them differently, e.g. keep the mono-wire, remove the multi-wires…
   * but we still allow multiple mono-wire boundary to identify to be able to write the above rule).
   * We can certainly fake other behaviors either by adding more rules, or by introducing a
   * node that just decompose links into two parts.
   */
  boundaryAnchorsBA?: AnchorMap,
  /**
   * Same for links. Details in the doc of the structure. You should specify here internal links and links with mono-wire boundary,
   * but not links with multi-wire boundaries (we don't care about them anyway).
   */
  linkBijectionAB?: LinkBijection,
  /**
   * Fix ambiguity when two multiple boundary nodes are connected to the same node.
   * Note that a single link may refer to multiple boundary names (e.g. loop in the diagram)
   * so that's why we need to map both ends to a boundary name.
   * Details in the doc of the structure.
   */
  ambiguityBoundaryLinksAB?: Record<LinkID, {from?: BoundaryName, to?: BoundaryName}>,
  /** Similarly, we maintain a map "node in 'to' rule" -> "node in final diagram".
   *  We can't just take the name in the new rule as we may have name collision.
   *  We also ignore boundary nodes.
   */
  nodeBijectionCD?: NodeBijection,
  /** Same for links */
  linkBijectionCD?: LinkBijection,
  /** For each final node you want to move, specify the final position */
  move?: Record<NodeID, Point>,
  /** Allow to change the viewport */
  viewport?: Viewport,
}

/** This proof step just specifies that two diagrams are identical except for the position of their nodes */
export type ProofStepMove = {
  /** Kind of proof step */
  kind: "move",
  /** Optional string to describe what we are doing in this step */
  description?: string,
  /** For each node you want to move, specify the final position */
  move?: Record<NodeID, Point>
  /** Allow to change the viewport */
  viewport?: Viewport,
}

/** Specify that the next proof steps (until ProofStepGroupEnd) belong to the same group, e.g. grouping trivial movements together,
 *  or proof generated via the same strategy/plugin/…
 *  We use this method (start & end in the same list instead of nesting proofSteps in a tree) because it is much simpler to deal with
 *  this encoding in the GUI: it is really efficient to derive the depth anyway, and the computationally expensive task is to actually
 *  apply the rule, and caching is certainly easier to do on lists than on trees since each application depends on the previous
 *  application.
 */
export type ProofStepGroupStart = {
  /** Kind of proof step */
  kind: "group",
  /** Title given to this group, e.g. shown in bold font */
  title?: string,
  /** Optional string to describe what we are doing in this step */
  description?: string,
}

/** Ends a group started with ProofStepGroupStart */
export type ProofStepGroupEnd = {
  /** Kind of proof step */
  kind: "groupEnd",
}

export type ProofStep = ProofStepApplyRule | ProofStepMove | ProofStepGroupStart | ProofStepGroupEnd

/** ID of a proof */
export type ProofID = string
/** Type containing a whole proof (or in-progress proof) */
export type Proof = {
  /** The name of the proof shown in the TAB */
  name: string,
  /** The starting diagram of the proof. Also specifies the theory since the diagram itself refers to a theory. */
  startingDiagram: Diagram,
  /** You can write a description of the current proof */
  description?: string,
  /** Specifies all the steps in the current proof */
  steps: ProofStep[],
  /** Step shown in the UI, defaults to 0 = starting diagram, 1 = first step etc */
  currentStep?: number,
}

/** Theory contains nodes and rules we can apply on the nodes */
export type Theory = {
  theoryName?: string,
  availableNodes?: Record<NodeKind, AvailableNode>,
  rules?: Record<RuleName, Rule>,
}

/** Identify a diagram */
export type DiagramID = string
export type Diagram = {
  name?: string,
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

/** Tabs are used to list diagrams/proofs and maybe later plugin-generated tabs etc */
export type Tab = TabDiagram | TabProof

export type TabDiagram = {
  tabKind: "tabDiagram",
  diagramID: DiagramID,
}

export type TabProof = {
  tabKind: "tabProof",
  proofID: ProofID,
}

/** Configuration of a whole file (contains all diagrams, theories, proofs…) */
export type DiagramConf = {
  /** Stores all diagrams contained in the current file. */
  diagrams: Record<DiagramID, Diagram>,
  /** Stores all the proofs that are currently under edit (theorems are moved to theories) */
  proofs: Record<ProofID, Proof>,
  /** Sorts them to show them in tabs. We don't simply use a list in diagrams for efficiently reasons */
  tabs: Tab[],
  /** Diagram currently under edit */
  currentTab: Tab,
  /** A theory is a list of nodes and rules. We allow multiple theories in the same file. */
  theories: Record<TheoryID, Theory>,
}


/** Configuration given by the user that is more permissive (e.g. links don't require ID). See diagramConfToDiagramConfByUser */
export type DiagramConfByUser = {
  /** Stores all diagrams contained in the current file. */
  diagrams?: Record<DiagramID, Diagram>,
  /** Stores all the proofs that are currently under edit (theorems are moved to theories) */
  proofs?: Record<ProofID, Proof>,
  /** Sorts them to show them in tabs. We don't simply use a list in diagrams for efficiently reasons.
   * If unspecified, this is equivalent to a single tab pointing to the "main" diagram
   */
  tabs?: Tab[],
  /** Diagram currently under edit. If unspecified, equals to the "main" diagram */
  currentTab?: Tab,
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
    throw new ProofDiagError("The diagram has two main nodes (diagramNodes and via diagrams.main)")
  }
  if (diagramConfByUser?.links && diagramConfByUser?.diagrams?.main) {
    throw new ProofDiagError("The diagram has two main nodes (links and via diagrams.main)")
  }
  if (diagramConfByUser?.viewport && diagramConfByUser?.diagrams?.main) {
    throw new ProofDiagError("The diagram has two main nodes (viewport and via diagrams.main)")
  }
  if (diagramConfByUser?.svgSize && diagramConfByUser?.diagrams?.main) {
    throw new ProofDiagError("The diagram has two main nodes (svgSize and via diagrams.main)")
  }
  if (diagramConfByUser?.linksWithID && diagramConfByUser?.diagrams?.main) {
    throw new ProofDiagError("The diagram has two main nodes (linksWithID and via diagrams.main)")
  }
  if (diagramConfByUser?.availableNodes && diagramConfByUser?.theories?.main) {
    throw new ProofDiagError("The diagram has two main theories (availableNodes and via theories.main)")
  }

  const {
    diagrams = {},
    proofs = {},
    tabs = [ {tabKind: "tabDiagram", diagramID: "main"} ],
    currentTab = {tabKind: "tabDiagram", diagramID: "main"},
    theories = {},
    diagramNodes,
    availableNodes,
    links,
    linksWithID,
    viewport,
    svgSize,
  } = diagramConfByUser
  const diagramsPreCleared : Record<DiagramID, Diagram> = (diagramNodes === undefined && links === undefined && viewport === undefined && svgSize === undefined) ? diagrams : {...diagrams, main: {
    name: "Main diagram",
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
      throw new ProofDiagError(`When importing the configuration we found multiple links with duplicated IDs: ${duplicates} in the diagram ${diagID}`)
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
        name: "Main diagram",
        nodes: {},
        linksWithID: {},
        theory: "main"
      },
    },
    proofs: proofs,
    tabs: tabs || [ {tabKind: "tabDiagram", diagramID: "main"} ],
    currentTab: currentTab || {tabKind: "tabDiagram", diagramID: "main"},
    theories: (availableNodes !== undefined || Object.keys(theories).length === 0) ? {...theories, main: {
      theoryName: "Main theory",
      availableNodes: availableNodes,
    }} : theories,
  }

  const isValidTab = (tab: Tab, tabDetails: string) => {
    const tabKind = tab.tabKind
    switch (tabKind) {
      case "tabDiagram":
        const diagramID = assertNotUndefined(tab?.diagramID, `The ${tabDetails} does not specify a diagramID`)
        assertNotUndefinedNR(
          cleanedConfig.diagrams?.[diagramID],
          `The diagram '${diagramID}' set in ${tabDetails} does not exist (valid diagrams ID are ${JSON.stringify(keys(cleanedConfig.diagrams))}).`
        )
        break;
      case "tabProof":
        const proofID = assertNotUndefined(tab?.proofID, `The current tab does not specify a proofID`)
        assertNotUndefinedNR(
          cleanedConfig?.proofs?.[proofID],
          `The proof '${proofID}' set in ${tabDetails} does not exist (valid proofs ID are ${JSON.stringify(keys(cleanedConfig.proofs))}).`
        )
        break;
      default:
        assertNever(tabKind, `Wrong tabKind in currentTab (should be either tabDiagram or tabProof)`)
    }
  }

  // Check if all tabs are well defined
  isValidTab(cleanedConfig.currentTab, `default tab`)

  cleanedConfig.tabs.forEach((tab, i) => {
    isValidTab(tab, `${i+1}-th tab`)
  })

  Object.entries(cleanedConfig.diagrams).forEach(([diagID, diag]) => {
    if (cleanedConfig.theories?.[diag?.theory || "main"] === undefined) {
      throw new ProofDiagError(`The diagram ${diagID} relies on a theory ${diag.theory} that does not exist in the list of theories.`)
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
      throw new ProofDiagError(`No 'name' field was provided when creating a new parameter in the SVG file.`)
    }
    if (type === null) {
      throw new ProofDiagError(`No 'type' field was provided for the param '${name}'`)
    }
    if (def === null) {
      throw new ProofDiagError(`No 'def' field was provided for the param '${name}'`)
    }
    if (!(paramAvailableTypes.includes(type))) {
      throw new ProofDiagError(`In the ${name} param definition, the type ${type} is not a valid type (${JSON.stringify(paramAvailableTypes)}).`)
    }
    if (type === "integer" && def !== null && isNaN(parseFloat(def))) {
      throw new ProofDiagError(`The type is int but the default value ${def} can't be turned into a def.`)
    }
    if (type === "boolean" && !["true", "false"].includes(def)) {
      throw new ProofDiagError(`The type is boolean but the default value (${def}) is not true/false.`)
    }
    if (unique !== null && !["true", "false"].includes(unique)) {
      throw new ProofDiagError(`In the definition of the ${name} parameter, the unique field must be true.`)
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
