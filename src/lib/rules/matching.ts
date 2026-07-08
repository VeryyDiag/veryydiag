// Functions in this file are not part of the "core" of ProofDiag since they are not involved when verifying the
// proof itself, only used to generate them easily. Hence we don't include it in rules.ts

import type { AnchorMap, Diagram, IDAnchor, LinkBijection, LinkID, NodeBijection, NodeID, Node, NodeKind, Theory, RuleName, ProofStepApplyRule } from "$lib/types/types"
import { assertNotUndefined, assertNotUndefinedNR, assertDontThrow, fullAnchorToIDAndAnchor, assertTrue, listsAreBijection, values, keys, entries, inverseBijection, listsAreUniqueAndIdenticalSets, listIsUnique, IDAnchorToFullAnchor, errToUndef, listsAreUniqueAndIdenticalSetsThrow, assertNever, listsAreNotOverlapping, listHasNoDuplicateE, listsAreEqualUpToOrdering, type BiMap, biMapFromMap, biMapElectCandidate, biMapIntersectCandidates, mapSetFromEntriesDuplicate, biMapGetUnique, randomID} from "$lib/utils"
import { ProofDiagError, getAnchorsNode, isBoundaryNode, isBoundaryNodeID, isMonoWireBoundaryNode, isMonoWireBoundaryNodeID, nbMultiWireBoundaryLink } from "$lib/types/types"
import { List, Map, Set } from "immutable"

function logStr(depth: number, msg: string) {
  return `${" ".repeat(depth)}→ ${msg}`
}

export type MatchingRule = {
  nodeBimapBA : BiMap<NodeID, NodeID>,
  linkBimapBA : BiMap<LinkID, LinkID>,
  monoAnchorsBimapBA : BiMap<IDAnchor, IDAnchor>,
}

function matchSelectionToDiagramLinkAux(
  depth: number, // Only for debug and print logs
  diagram: Diagram,
  ruleDiagram: Diagram,
  theory: Theory,
  nodeBimapBA : BiMap<NodeID, NodeID>,
  linkBimapBA : BiMap<LinkID, LinkID>,
  monoAnchorsBimapBA : BiMap<IDAnchor, IDAnchor>,
  linksInA : Map<IDAnchor, Set<LinkID>>,
  linksInB : Map<IDAnchor, Set<LinkID>>,
  log: ((msg: string) => void) = (msg) => {console.log(msg)},
) : MatchingRule {
  const toElect = List(linkBimapBA.forward.filter((aS, b) => !linkBimapBA.alreadyElected.has(b))).sortBy(([b, aS]) => aS.size).first()
  if (toElect === undefined) {
    // We have finished to attribute all links (and nodes), it's over (TODO: deal with multi-wire boundary nodes etc)
    // TODO: check if no extra extra links are present etc. This will be checked when applying the rule of course,
    // but maybe we will also skip a better matching… Maybe directly try to apply the rule based on the matching?
    // Here we don't have the other part of the rule, either provide it or apply it with the wrong rule, or do it
    // in a different function?
    return { nodeBimapBA, monoAnchorsBimapBA, linkBimapBA}
  }
  const [linkIDtoElect, candidates] = toElect
  log(logStr(depth, `We will try to find a matching for the rule link ?? --> ${linkIDtoElect} among the candidates ${candidates.toString()}`))
  const linkToElect = assertNotUndefined(ruleDiagram?.linksWithID?.[linkIDtoElect],
                                         `Weird, this should never occur, please report a bug`)
  const [electFromID, electFromAnchor] = fullAnchorToIDAndAnchor(linkToElect.from)
  const [electToID, electToAnchor] = fullAnchorToIDAndAnchor(linkToElect.to)
  const electFromIsMonoWireBoundary = isMonoWireBoundaryNodeID(electFromID, ruleDiagram, theory)
  const electToIsMonoWireBoundary = isMonoWireBoundaryNodeID(electToID, ruleDiagram, theory)
  // Remove the link since it is already attributed
  // TODO: visit in order based on selection/alphabetic names of anchors to allow to resolve ambiguity
  for (const linkIDScandidate of candidates) {
    try {
      log(logStr(depth+1, `We explore the candidate ${linkIDScandidate} in the selection`))
      // First, we check if our candidate is obviously wrong (bad input/output)
      const linkScandidate = assertNotUndefined(diagram?.linksWithID?.[linkIDScandidate],
                                                `Weird, this should never occur, please report a bug`)
      const [candFromID, candFromAnchor] = fullAnchorToIDAndAnchor(linkScandidate.from)
      const [candToID, candToAnchor] = fullAnchorToIDAndAnchor(linkScandidate.to)
      const electFromIDAnchorTranslated = electFromIsMonoWireBoundary ? undefined
                                        : IDAnchorToFullAnchor(
                                          biMapGetUnique(nodeBimapBA, electFromID),
                                          electFromAnchor
                                        )
      const electToIDAnchorTranslated = electToIsMonoWireBoundary ? undefined
                                      : IDAnchorToFullAnchor(
                                        biMapGetUnique(nodeBimapBA, electToID),
                                        electToAnchor
                                      )
      const setA = Set([linkScandidate.from, linkScandidate.to]
        .filter(x => x !== undefined))
      const setB = Set([electFromIDAnchorTranslated, electToIDAnchorTranslated]
        .filter(x => x !== undefined))
      if (!setA.isSuperset(setB)) {
        throw new ProofDiagError(`Different starting/ending points (${setA.toString()} != ${setB.toString()})`)
      }
      // In some cases (two mono-wire boundary nodes) we need to try multiple assignments
      let newMonoAnchorsBimapBAToTry : BiMap<IDAnchor, IDAnchor>[] = []
      // Deal with mono-wire boundary links
      if (electFromIsMonoWireBoundary && electToIsMonoWireBoundary) {
        // We have here two possible matches… try both of them
        // First we try to assign both ends like if it both links were in the same direction:
        log(logStr(depth+1, `Both ends of the rule wire are a mono-wire boundary, hence we have two possible ways to match the mono-wire boundary`))
        newMonoAnchorsBimapBAToTry.push(
          biMapElectCandidate(
            biMapElectCandidate(
              monoAnchorsBimapBA,
              linkToElect.from,
              linkScandidate.from
            ),
            linkToElect.to,
            linkScandidate.to
          )
        )
        // Then we try to assign both ends like if it both links were in the different direction:
        newMonoAnchorsBimapBAToTry.push(
          biMapElectCandidate(
            biMapElectCandidate(
              monoAnchorsBimapBA,
              linkToElect.from,
              linkScandidate.to
            ),
            linkToElect.to,
            linkScandidate.from
          )
        )
      } else if (electFromIsMonoWireBoundary) {
        log(logStr(depth+1, `The starting point of the rule wire is a mono-wire boundary. So far, detected mono-wire boundaries are ${monoAnchorsBimapBA.forward.toString()}`))
        const linkSameDirection = linkScandidate.to === electToIDAnchorTranslated
        newMonoAnchorsBimapBAToTry.push(biMapElectCandidate(
          monoAnchorsBimapBA,
          linkToElect.from,
          linkSameDirection ? linkScandidate.from : linkScandidate.to
        ))
      } else if (electToIsMonoWireBoundary) {
        log(logStr(depth+1, `The ending point of the rule wire is a mono-wire boundary. So far, detected mono-wire boundaries are ${monoAnchorsBimapBA.forward.toString()}`))
        const linkSameDirection = linkScandidate.from === electFromIDAnchorTranslated
        newMonoAnchorsBimapBAToTry.push(biMapElectCandidate(
          monoAnchorsBimapBA,
          linkToElect.to,
          linkSameDirection ? linkScandidate.to : linkScandidate.from
        ))
      } else {
        newMonoAnchorsBimapBAToTry.push(monoAnchorsBimapBA)
      }
      for (const newMonoAnchorsBimapBA of newMonoAnchorsBimapBAToTry) {
        // TODO: check parameters etc
        log(logStr(depth+1, `Trying the mono-anchor assignment ${newMonoAnchorsBimapBA.toString()}…`))
        try {
          const newLinkBimapBA = biMapElectCandidate(linkBimapBA, linkIDtoElect, linkIDScandidate)
          return matchSelectionToDiagramLinkAux(
            depth + 2,
            diagram,
            ruleDiagram,
            theory,
            nodeBimapBA,
            newLinkBimapBA,
            newMonoAnchorsBimapBA,
            linksInA,
            linksInB,
            log
          )
        } catch (e) {
          log(logStr(depth+1, `The mono-anchor assignment ${newMonoAnchorsBimapBA.forward.toString()} failed`))
        }
      }
    } catch (e) {
      log(logStr(depth, `Failed to assign the link ${linkIDtoElect} --> ${linkIDScandidate} (${e})`))
    }
  }
  throw new ProofDiagError(`We found no way to match the links in the diagram`)
}

// Attributes the nodes first
function matchSelectionToDiagramAux(
  depth: number, // To print logs and debug only
  diagram: Diagram,
  ruleDiagram: Diagram,
  theory: Theory,
  nodeBimapBA : BiMap<NodeID, NodeID>,
  linkBimapBA : BiMap<LinkID, LinkID>,
  monoAnchorsBimapBA : BiMap<IDAnchor, IDAnchor>,
  linksInA : Map<IDAnchor, Set<LinkID>>,
  linksInB : Map<IDAnchor, Set<LinkID>>,
  log: ((msg: string) => void) = (msg) => {console.log(msg)},
) : MatchingRule {
  // We pick an element to that we will try to assign a value now
  // For efficiency reason, we pick the one with less candidates to limit branching
  // (to check: toSeq should turn this into a lazy sorting)
  const toElect = List(nodeBimapBA.forward.filter((aS, b) => !nodeBimapBA.alreadyElected.has(b))).sortBy(([b, aS]) => aS.size).first()
  if (toElect === undefined) {
    // We have finished to attribute all nodes, we deal with links now!
    log(logStr(depth,`We have found a matching for all nodes, now we match links!`))
    return matchSelectionToDiagramLinkAux(depth + 1, diagram, ruleDiagram, theory, nodeBimapBA, linkBimapBA, monoAnchorsBimapBA, linksInA, linksInB, log)
  }
  const [nodeIDtoElect, candidates] = toElect
  log(logStr(depth,`We will try to find a diagram node matching ?? --> ${nodeIDtoElect} among ${candidates.toString()}`))
  const nodeToElect = assertNotUndefined(ruleDiagram?.nodes?.[nodeIDtoElect],
                                         `Weird, this should never occur, please report a bug`)
  // Remove the node since it is already attributed
  for (const nodeIDScandidate of candidates) {
    try {
      log(logStr(depth+1,`Trying to assign the node ${nodeIDScandidate} --> ${nodeIDtoElect}…`))
      // We elect our new candidate
      let newNodeBimapBA = biMapElectCandidate(nodeBimapBA, nodeIDtoElect, nodeIDScandidate)
      // To optimize the search tree, we try to restrict further the candidates for nodes
      // For this, for each anchor, we look for all the neighbours of nodeToElect and its candidate,
      // and we restrict by saying that each neighbour in B must have for candidate one of the neighbours in B.
      keys(getAnchorsNode(nodeToElect, theory) || {}).forEach(anchor => {
        // First, we get the neighbours of the node in B
        const IDAnchor = IDAnchorToFullAnchor(nodeIDtoElect, anchor)
        const linkIDsB : Set<LinkID> = linksInB.get(IDAnchor, Set())
        const linksB = linkIDsB.map(linkID => assertNotUndefined(ruleDiagram?.linksWithID?.[linkID], `Weird, report a bug`))
        const neighboursB : Set<NodeID> = linksB.map(link => {
          const neighbourIDAnchors = [link.from, link.to].filter(x => x !== IDAnchor)
          if (neighbourIDAnchors.length !== 1) {
            // If it is zero, it is a self loop: don't care, 2 should never occur
            return undefined
          }
          const neighbourIDAnchor = neighbourIDAnchors[0]
          const [neighbourID, neighbourAnchor] = fullAnchorToIDAndAnchor(neighbourIDAnchor)
          if (neighbourID === nodeIDtoElect) {
            return undefined
          }
          // We ignore mono-wire boundary
          if (isBoundaryNodeID(neighbourID, ruleDiagram)) {
            return undefined
          }
          return neighbourID
        }).filter(x => x !== undefined)
        // Same for its candidate in A
        const IDAnchorA = IDAnchorToFullAnchor(nodeIDScandidate, anchor)
        const linkIDsA : Set<LinkID> = linksInA.get(IDAnchorA, Set())
        const linksA = linkIDsA.map(linkID => assertNotUndefined(diagram?.linksWithID?.[linkID], `Weird, report a bug`))
        const neighboursA : Set<NodeID> = linksA.map(link => {
          const neighbourIDAnchors = [link.from, link.to].filter(x => x !== IDAnchorA)
          // If it is zero, it is a self loop: don't care, 2 should never occur
          if (neighbourIDAnchors.length !== 1) {
            return undefined
          }
          const neighbourIDAnchor = neighbourIDAnchors[0]
          const [neighbourID, neighbourAnchor] = fullAnchorToIDAndAnchor(neighbourIDAnchor)
          if (neighbourID === nodeIDtoElect) {
            return undefined
          }
          return neighbourID
        }).filter(x => x !== undefined)
        // We restrict each neighbour in B by saying that their candidate must be the neighbours in A:
        neighboursB.forEach(neighbourB => {
          newNodeBimapBA = biMapIntersectCandidates(newNodeBimapBA, neighbourB, neighboursA)
        })
      })

      return matchSelectionToDiagramAux(
        depth + 2,
        diagram,
        ruleDiagram,
        theory,
        newNodeBimapBA,
        linkBimapBA,
        monoAnchorsBimapBA,
        linksInA,
        linksInB,
        log
      )
    } catch (e) {
      log(logStr(depth+1,`Failed to assign the node ${nodeIDScandidate} --> ${nodeIDtoElect} (${e})`))
    }
  }
  throw new ProofDiagError(`We found no way to match the selection to the diagram`)
}


export function matchSelectionToDiagram(
  nodeSelection: NodeID[],
  linkSelection: LinkID[],
  diagram: Diagram,
  ruleDiagram: Diagram,
  theory: Theory,
  log: ((msg: string) => void) = (msg) => {console.log(msg)},
) : {
  nodeBijectionAB: NodeBijection,
  boundaryAnchorsBA: AnchorMap,
  linkBijectionAB: LinkBijection,
} {
  const linkSelectionInDiagram = linkSelection.filter(linkID => diagram?.linksWithID?.[linkID] !== undefined)
  const linkSelectionIm = Set(linkSelectionInDiagram)

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
  // Create a node bimap, matching nodes in B to their candidates in A
  // The algorithm will then slowly restrict these candidates until finding one that
  // actually works.
  const nodeBimapBA : BiMap<NodeID, NodeID> = biMapFromMap(
    // TODO EFFICIENCY: to be more efficient, we can do a pre-selection here, e.g. by filtering with the
    // number of links per anchor etc. This way, we can certainly cut many branches in the exploration.
    // But anyway, most of the time rules just have a few nodes with the same kind so we don't expect this to
    // be a bottleneck for now.
    nonBoundaryNodesB.map((node) => Set(groupsNBNodeKindsS.get(node.nodeKind)?.keys()))
  )

  // Same for mono-boundary links, but first we collect all possible candidates
  // TODO: here it assumes that all mono-wire boundary nodes are connected to at least one link (or this would not work)
  // Is there interesting cases where this might not be the case ?
  const monoAnchorsCandidates = Set(linkSelectionInDiagram).flatMap(linkID => {
    const link = assertNotUndefined(diagram?.linksWithID?.[linkID], `Selected link ${linkID} do not belong to the diagram`)
    return [link.from, link.to]
  })
  const monoAnchorsBimapBA : BiMap<IDAnchor, IDAnchor> = biMapFromMap(
    Map(ruleDiagram?.nodes || {}).filter((node, nodeID) => isMonoWireBoundaryNode(node, theory)).flatMap((node, nodeID) : [IDAnchor, Set<IDAnchor>][] => {
      const anchors = keys(getAnchorsNode(node, theory))
      return anchors.map(anchor => [IDAnchorToFullAnchor(nodeID, anchor), monoAnchorsCandidates])
    }),
    false, // We put more candidates in Y than elements in X
  )
  if (monoAnchorsBimapBA.forward.isEmpty()) {
    log("WARNING: we found no mono-wire boundary anchor in the rule, i.e. we can apply this rule only on closed sub-diagrams with no outside connection, unless you also have multi-wire boundary.")
    // TODO: better error message with multi-wire boundaries
  }
  console.log("monoAnchorsBimapBA", monoAnchorsBimapBA.forward.toString())

  // Same for links
  const linkBimapBA : BiMap<LinkID, LinkID> = biMapFromMap(
    // TODO: we should also see how to deal with users that don't select all links,
    // notably mono-boundary links. Maybe if it fails restart by selecting automatically
    // all the neighboring links?
    Map(ruleDiagram?.linksWithID || {})
      .filter((link, linkID) => nbMultiWireBoundaryLink(linkID, ruleDiagram, theory) === 0)
      .mapEntries(([linkID, link]) =>
        // TODO EFFICIENCY: to be more efficient, we can do a pre-selection here,
        // e.g. by filtering links with the same kinds of from/to anchors etc.
        // But I'm not sure if this will bring a huge improvement since anyway
        // that arrives basically at the leaves, so I don't think it creates much branching.
        [linkID, linkSelectionInDiagram]
      )
  )

  // It will help here to be able to quickly identify which link leaves/enter
  // from which node/anchor.
  const linksInB : Map<IDAnchor, Set<LinkID>> = mapSetFromEntriesDuplicate(
    List(entries(ruleDiagram?.linksWithID)
      .map(([linkID, link]) : [IDAnchor, LinkID][] =>
        [[link.from, linkID], [link.to, linkID]]).flat(1)))
  const linksInA : Map<IDAnchor, Set<LinkID>> = mapSetFromEntriesDuplicate(
    List(entries(diagram?.linksWithID)
      .map(([linkID, link]) : [IDAnchor, LinkID][] =>
        [[link.from, linkID], [link.to, linkID]]).flat(1)))

  const r = matchSelectionToDiagramAux(
    0,
    diagram,
    ruleDiagram,
    theory,
    nodeBimapBA,
    linkBimapBA,
    monoAnchorsBimapBA,
    linksInA, // Helpers to avoid recomputing the same thing again and again
    linksInB, // Helpers to avoid recomputing the same thing again and again
    log,
  )
  return {
    // Maps from immutable.js back to js object
    nodeBijectionAB: r.nodeBimapBA.backward.mapEntries(([a, bs]) => {
      assertTrue(bs.size === 1, `Weird, we expect at the end all matched elements to have only one element but elements corresponding to ${a} have ${bs.size} elements (${bs.toString()})`)
      return [a, assertNotUndefined(bs.first(), `Should never occur, please report a bug`)]
    }).toObject(),
    boundaryAnchorsBA: r.monoAnchorsBimapBA.forward.mapEntries(([b, as]) => {
      assertTrue(as.size === 1, `Weird, we expect at the end all matched links in monoAnchorsBimapBA to have only one element but elements corresponding to ${b} have ${as.size} elements (${as.toString()}), please report a bug`)
      return [b, assertNotUndefined(as.first(), `Should never occur, please report a bug`)]
    }).toObject(),
    linkBijectionAB: r.linkBimapBA.backward.mapEntries(([a, bs]) => {
      assertTrue(bs.size === 1, `Weird, we expect at the end all matched elements to have only one element but elements corresponding to ${a} have ${bs.size} elements (${bs.toString()})`)
      return [a, assertNotUndefined(bs.first(), `Should never occur, please report a bug`)]
    }).toObject(),
  }
}

export function proofStepApplyRuleFromSelection(
  nodeSelection: NodeID[],
  linkSelection: LinkID[],
  diagram: Diagram,
  ruleName: RuleName,
  direction: "lr" | "rl",
  theory: Theory,
  log: ((msg: string) => void) = (msg) => {console.log(msg)},
) : ProofStepApplyRule {
  const rule = assertNotUndefined(theory?.rules?.[ruleName], `Rule ${ruleName} does not exist in theory`)
  const rhs = assertNotUndefined(rule?.rhs, `The RHS of the rule is not defined`)
  const lhs = assertNotUndefined(rule?.lhs, `The RHS of the rule is not defined`)
  const [ruleFrom, ruleTo] = direction === "lr"
                           ? [lhs, rhs]
                           : [rhs, lhs]
  const {
    nodeBijectionAB,
    boundaryAnchorsBA,
    linkBijectionAB,
  } = matchSelectionToDiagram(nodeSelection, linkSelection, diagram, ruleFrom, theory, log)
  const nodeBijectionCD = Object.fromEntries(
    entries(ruleTo?.nodes).filter(([nodeID, node]) => !isBoundaryNode(node)).map(([nodeID, node]) => [nodeID, randomID()])
  )
  return {
    kind: "applyRule",
    ruleName,
    direction,
    nodeBijectionAB,
    boundaryAnchorsBA,
    linkBijectionAB,
    // We just pick random IDs, simple way to avoid collision
    nodeBijectionCD,
    linkBijectionCD: Object.fromEntries(
      entries(ruleTo?.linksWithID).filter(([linkID, link]) => nbMultiWireBoundaryLink(linkID, ruleTo, theory) === 0)
                                  .map(([linkID, link]) => [linkID, randomID()])
      ),
    // TODO: output an arbitrary one and let the user, later, change it in the "proof" menu
    // ambiguityBoundaryLinksAB,
  }
}
