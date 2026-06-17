// Functions in this file are not part of the "core" of ProofDiag since they are not involved when verifying the
// proof itself, only used to generate them easily. Hence we don't include it in rules.ts

import type { AnchorMap, Diagram, IDAnchor, LinkBijection, LinkID, NodeBijection, NodeID, Node, NodeKind } from "$lib/types/types"
import { assertNotUndefined, assertNotUndefinedNR, assertDontThrow, fullAnchorToIDAndAnchor, assertTrue, listsAreBijection, values, keys, entries, inverseBijection, listsAreUniqueAndIdenticalSets, listIsUnique, IDAnchorToFullAnchor, errToUndef, listsAreUniqueAndIdenticalSetsThrow, assertNever, listsAreNotOverlapping, listHasNoDuplicateE, listsAreEqualUpToOrdering, type BiMap, biMapFromMap, biMapElectCandidate } from "$lib/utils"
import { ProofDiagError, isBoundaryNode } from "$lib/types/types"
import { List, Map, Set } from "immutable"


export type MatchingRule = {
  nodeBimapBA : BiMap<NodeID, NodeID>,
  boundaryAnchorsBA: Map<IDAnchor, IDAnchor>,
  linkBijectionAB: Map<LinkID, LinkID>,
}

// Attributes the nodes first
function matchSelectionToDiagramAux(
  diagram: Diagram,
  ruleDiagram: Diagram,
  nodeBimapBA : BiMap<NodeID, NodeID>,
  // Accumulators in the recursion
  boundaryAnchorsBA: Map<IDAnchor, IDAnchor>,
  linkBijectionAB: Map<LinkID, LinkID>,
) : MatchingRule {
  // We pick an element to that we will try to assign a value now
  // For efficiency reason, we pick the one with less candidates to limit branching
  // (to check: toSeq should turn this into a lazy sorting)
  const toElect = List(nodeBimapBA.forward.filter((aS, b) => !nodeBimapBA.alreadyElected.has(b))).sortBy(([b, aS]) => aS.size).first()
  if (toElect === undefined) {
    // We have finished our loop, we return!
    return { nodeBimapBA, boundaryAnchorsBA, linkBijectionAB }
  }
  const [nodeIDtoElect, candidates] = toElect
  // Remove the node since it is already attributed
  for (const nodeIDScandidate of candidates) {
    try {
      return matchSelectionToDiagramAux(
        diagram,
        ruleDiagram,
        biMapElectCandidate(nodeBimapBA, nodeIDtoElect, nodeIDScandidate),
        // Accumulators in the recursion
        boundaryAnchorsBA,
        linkBijectionAB,
      )
    } catch (e) {
      console.log(`Failed to assign ${nodeIDScandidate} to ${nodeIDtoElect} (${e})`)
    }
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
  // Create a bimap
  const nodeBimapBA : BiMap<NodeID, NodeID> = biMapFromMap(
    // TODO EFFICIENCY: to be more efficient, we can do a pre-selection here, e.g. by filtering with the
    // number of links per anchor etc. This way, we can certainly cut many branches in the exploration.
    // But anyway, most of the time rules just have a few nodes with the same kind so we don't expect this to
    // be a bottleneck for now.
    nonBoundaryNodesB.map((node) => Set(groupsNBNodeKindsS.get(node.nodeKind)?.keys()))
  )

  const r = matchSelectionToDiagramAux(
    diagram,
    ruleDiagram,
    nodeBimapBA,
    // Accumulators
    Map(),
    Map(),
  )
  return {
    // Maps from immutable.js back to js object
    nodeBijectionAB: r.nodeBimapBA.backward.mapEntries(([a, bs]) => {
      assertTrue(bs.size === 1, `Weird, we expect at the end all matched elements to have only one element but elements corresponding to ${a} have ${bs.size} elements (${bs.toString()})`)
      return [a, assertNotUndefined(bs.first(), `Should never occur, please report a bug`)]
    }).toObject(),
    boundaryAnchorsBA: r.boundaryAnchorsBA.toObject(),
    linkBijectionAB: r.linkBijectionAB.toObject(),
  }
}
