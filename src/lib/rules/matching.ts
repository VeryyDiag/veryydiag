// Functions in this file are not part of the "core" of ProofDiag since they are not involved when verifying the
// proof itself, only used to generate them easily. Hence we don't include it in rules.ts

import type { AnchorMap, Diagram, IDAnchor, LinkBijection, LinkID, NodeBijection, NodeID, Node, NodeKind } from "$lib/types/types"
import { assertNotUndefined, assertNotUndefinedNR, assertDontThrow, fullAnchorToIDAndAnchor, assertTrue, listsAreBijection, values, keys, entries, inverseBijection, listsAreUniqueAndIdenticalSets, listIsUnique, IDAnchorToFullAnchor, errToUndef, listsAreUniqueAndIdenticalSetsThrow, assertNever, listsAreNotOverlapping, listHasNoDuplicateE, listsAreEqualUpToOrdering } from "$lib/utils"
import { ProofDiagError, isBoundaryNode } from "$lib/types/types"
import { List, Map } from "immutable"


export type MatchingRule = {
  nodeBijectionAB: Map<NodeID, NodeID>,
  boundaryAnchorsBA: Map<IDAnchor, IDAnchor>,
  linkBijectionAB: Map<LinkID, LinkID>,
}

// Attributes the nodes first
function matchSelectionToDiagramAux(
  diagram: Diagram,
  ruleDiagram: Diagram,
  nonBoundaryNodesB : Map<NodeID, Node>,
  groupsNBNodeKindsS : Map<NodeKind, Map<NodeID, Node>>,
  // Accumulators in the recursion
  nodeBijectionAB: Map<NodeID, NodeID>,
  boundaryAnchorsBA: Map<IDAnchor, IDAnchor>,
  linkBijectionAB: Map<LinkID, LinkID>,
) : MatchingRule {
  const r = nonBoundaryNodesB.entrySeq().first()
  if (r === undefined) { // No more nodes to match!!
    // TODO: deal with links and boundary nodes then
    return { nodeBijectionAB, boundaryAnchorsBA, linkBijectionAB }
  }
  const [nodeID, node] = r
  // Remove the node since it is already attributed
  const newNonBoundaryNodesB = nonBoundaryNodesB.delete(nodeID)
  const allCandidatesS = assertNotUndefined(
    groupsNBNodeKindsS.get(node.nodeKind),
    `The node ${nodeID} of the diagram has no more matches in the selection (weird, this should have be caught earlier, please report a bug)`).entrySeq()
  const n = allCandidatesS.count()
  for (const [nodeIDS, nodeS] of allCandidatesS) {
    try {

      const newGroupsNBNodeKindsS = n <= 1
                                  ? groupsNBNodeKindsS.delete(node.nodeKind)
                                  : groupsNBNodeKindsS.deleteIn([node.nodeKind, nodeIDS])
      return matchSelectionToDiagramAux(diagram, ruleDiagram, newNonBoundaryNodesB, newGroupsNBNodeKindsS,
                                        nodeBijectionAB.set(nodeIDS, nodeID),
                                        boundaryAnchorsBA,
                                        linkBijectionAB
      )
    } catch {}
  }
  throw new ProofDiagError(`We found no way to match the selection to the diagram`)
}

export function matchSelectionToDiagram(
  nodeSelection: NodeID[],
  linkSelection: LinkID[],
  diagram: Diagram,
  ruleDiagram: Diagram,
) : {
  nodeBijectionAB: NodeBijection,
  boundaryAnchorsBA: AnchorMap,
  linkBijectionAB: LinkBijection,
} {
  // We maintain this list , to avoid to search for no reason, we check if the remaining nodes to map are compatible
  const nonBoundaryNodesB : Map<NodeID, Node> = Map(ruleDiagram?.nodes || {}).filter((node, nodeID) => !isBoundaryNode(node))

  const selectionMap : Map<NodeID, Node> = Map(nodeSelection.map((nodeID) : [NodeID, Node | undefined] => [nodeID, diagram?.nodes?.[nodeID]]).filter((nidn) : nidn is [NodeID, Node] => nidn[1] !== undefined))
  const nonBoundarySelection : Map<NodeID, Node> = selectionMap.filter((node, nodeID) => !isBoundaryNode(node))
  // const nonBoundarySelection : Map<NodeID, Node> = Map(nodeSelection.map(nodeID =)).filter((node, nodeID) => !isBoundaryNode(node))

  const nodesA : Map<NodeID, Node> = Map(diagram?.nodes || {})
  const groupsNBNodeKindsB : Map<NodeKind, Map<NodeID, Node>> = nonBoundaryNodesB.groupBy(node => node.nodeKind)
  const groupsNBNodeKindsS : Map<NodeKind, Map<NodeID, Node>> = nonBoundarySelection.groupBy(node => node.nodeKind)
  // Check if it is trivially impossible to proceed to the matching
  // same number for each kind between rule nodes and selection
  const nodeKindVsNumberB : Map<NodeKind, number> = groupsNBNodeKindsB.map((col) => col.size)
  const nodeKindVsNumberS : Map<NodeKind, number> = groupsNBNodeKindsS.map(col => col.size)
  if (!nodeKindVsNumberB.equals(nodeKindVsNumberS)) {
    throw new ProofDiagError(`Impossible to match the selection to the rule as it must contain for each nodeKind the same number of elements and here we have: selection = ${nodeKindVsNumberS.toString()} != ${nodeKindVsNumberB.toString()} = rule`)
  }

  const r = matchSelectionToDiagramAux(
    diagram,
    ruleDiagram,
    nonBoundaryNodesB,
    groupsNBNodeKindsS,
    // Accumulators
    Map(),
    Map(),
    Map(),
  )
  return {
    // Maps from immutable.js back to js object
    nodeBijectionAB: r.nodeBijectionAB.toObject(),
    boundaryAnchorsBA: r.boundaryAnchorsBA.toObject(),
    linkBijectionAB: r.linkBijectionAB.toObject(),
  }
}
