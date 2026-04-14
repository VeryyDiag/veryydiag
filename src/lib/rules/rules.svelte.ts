import type { Diagram, ProofStep, Theory, NodeBijection, NodeID, LinkID, LinkBijection } from "$lib/types/types" 
import { assertNotUndefined } from "$lib/utils.svelte" 
import { isBoundaryNode, nodeKindBoundaries } from "$lib/types/types"
import { fullAnchorToIDAndAnchor } from "$lib/utils.svelte" 
// MAYBETODO: rewrite this with OCaml and/or rust to link it with Rocq/Lean/…

/** Make sure to provide a **copy** of the diagram if you want to keep it,
 * since we will remove nodes etc to create the new diagram */
export function proofApplyOneStep(diagram: Diagram, proofStep: ProofStep, theory: Theory) {
  const rule = theory.rules?.[proofStep.ruleName]
  if (rule === undefined) {
    throw new Error(`The rule ${proofStep.ruleName} does not exist`)
  }
  if (rule?.lhs === undefined) {
    throw new Error(`The rule ${proofStep.ruleName} has an undefined lhs`)
  }
  if (rule?.rhs === undefined) {
    throw new Error(`The rule ${proofStep.ruleName} has an undefined rhs`)
  }
  const ruleFrom: Diagram = proofStep.direction === "lr" ? rule.lhs : rule.rhs;
  // List of nodes involved in the rule (resp. diagram) A -> B -> C -> D
  const nodesB : NodeID[] = Object.keys(ruleFrom?.nodes || {})
  const nodesA : NodeID[] = nodesB.map((nameB : NodeID) => proofStep.nodeBijectionFrom[nameB])
  const ruleTo: Diagram = proofStep.direction === "lr" ? rule.rhs : rule.lhs;
  const nodesC : NodeID[] = Object.keys(ruleTo?.nodes || {})
  const nodesD : NodeID[] = nodesC.map((nameC : NodeID) => proofStep.nodeBijectionTo[nameC])
  // ========== First we check if the proofStep is well formed ==========
  // Check if really bijections?
  // TODO: more precise error messages (which element is wrong)
  const loop : [NodeBijection, LinkBijection, Diagram, string][] = [
    [proofStep.nodeBijectionFrom, proofStep.linkBijectionFrom, ruleFrom, "From"],
    [proofStep.nodeBijectionTo, proofStep.linkBijectionTo, ruleTo, "To"]
  ];
  loop.forEach(
    (
      [nodeBijection, linkBijection, currentRule, which]
    ) => {
      // Really bijections with (nodes…
      if ((new Set(Object.values(nodeBijection))).size
        !== (new Set(Object.keys(currentRule.nodes || {}).filter(x => !nodeKindBoundaries.includes(assertNotUndefined(currentRule?.nodes?.[x].nodeKind, `The node ${x} has no nodeKind.`))))).size) {
        throw new Error(`When applying the rule ${proofStep.ruleName}, we found that the nodeBijection${which} is not a bijection (you map some nodes to the same output)`)
      }
      // … and links)
      if ((new Set(Object.values(linkBijection))).size !== (new Set(Object.keys(currentRule))).size) {
        throw new Error(`Whe applying the rule ${proofStep.ruleName}, we found that the linkBijection${which} is not a bijection (you map some links to the same output)`)
      }
      // Boundary nodes should not appear in the bijection…
      if (Object.keys(nodeBijection).filter(nodeID => nodeKindBoundaries.includes(assertNotUndefined(currentRule?.nodes?.[nodeID]?.nodeKind, `The node ${nodeID} has no nodeKind`))).length > 0) {
        throw new Error(`The special nodes kinds in ${JSON.stringify(nodeKindBoundaries)} is not allowed in nodeBijection input.`)
      }
      // … (in either ends)
      if (Object.values(nodeBijection).filter(nodeID => nodeKindBoundaries.includes(assertNotUndefined(currentRule?.nodes?.[nodeID]?.nodeKind, "The node ${x} has no nodeKind."))).length > 0) {
        throw new Error(`The special nodes kinds in ${JSON.stringify(nodeKindBoundaries)} is not allowed in nodeBijection output.`)
      }
  })
  // Bijection maps to existing nodes…
  if (
    new Set(Object.keys(diagram?.nodes || {}))
    !== new Set(Object.keys(proofStep.nodeBijectionFrom))
  ) {
    throw new Error(`We detected that you forgot some nodes from the diagram in nodeBijectionFrom`)
  }
  // … and links.
  if (
    new Set(Object.keys(diagram?.linksWithID || {}))
    !== new Set(Object.keys(proofStep.linkBijectionFrom))
  ) {
    throw new Error(`We detected that you forgot some links from the diagram in linkBijectionFrom`)
  }
  // TODO: Check if links actually belong to the nodes in the rewritting context (more generally that the diagram is valid)

  // We build the inverse of the bijection for efficiency reasons (A = first diagram, B = first rule diagram)
  const linkAtoB : Record<NodeID, NodeID> = Object.fromEntries(Object.entries(proofStep.linkBijectionFrom).map(([k,v]) => [v, k]))
  const nodeAtoB : Record<NodeID, NodeID> = Object.fromEntries(Object.entries(proofStep.nodeBijectionFrom).map(([k,v]) => [v, k]))

  // Instructions to delete/rewire/etc We avoid to remove in the loop in case it disturbs the process.
  const linksToDelete : LinkID[] = []
  
  // All links are either boundary links, outside current rewritting context, or listed in the bijection
  Object.entries((diagram?.linksWithID || {})).forEach(([linkID, link]) => {    
    // Check if the link is inside the rewritting context (i.e. rule applies to current link)
    const [fromNode, fromAnchor] = fullAnchorToIDAndAnchor(link.from)
    const [toNode, toAnchor] = fullAnchorToIDAndAnchor(link.to)
    if (!nodesA.includes(fromNode)) {
      // The link does NOT start inside the context
      if (!nodesA.includes(toNode)) {
        // The link does NOT end inside the context: this link is therefore not concerned by this rule
        // hence we do nothing
      } else {
        // The link ends inside the context. Hence this node is next to the boundary
        // We check if the corresponding node allows boundary connections
        const nodeAtBoundaryR = nodeAtoB[toNode]
        // TODO: think about case when a rewritting rules has two boundary nodes pointing to the same node
        // that only allow one connection (we would need to count this as allowing two connections etc). Or
        // just forbid this for now.
        // We search for all links that link to nodeAtBoundaryR and see if one (or multiple?) are boundary nodes
        const boundaries = Object.entries(ruleFrom?.linksWithID || {}).filter(([linkID, link]) =>
          link.to === nodeAtBoundaryR && isBoundaryNode(link.from, ruleFrom)
        )
        // TODO: add additional restrictions/weakening, notably in term of direction of the wire
        if (boundaries.length === 0) {
          throw new Error(`The node ${nodeAtBoundaryR} is not connected to a boundary node.`)
        }
      }
    } else {
      // The link starts inside the context
      if (!nodesA.includes(toNode)) {
        // The link ends outside the context: this node is next to the boundary
        // We check if the corresponding node allows boundary connections
        const nodeAtBoundaryR = nodeAtoB[fromNode]
        // TODO: think about case when a rewritting rules has two boundary nodes pointing to the same node
        // that only allow one connection (we would need to count this as allowing two connections etc). Or
        // just forbid this for now.
        // We search for all links that link to nodeAtBoundaryR and see if one (or multiple?) are boundary nodes
        const boundaries = Object.entries(ruleFrom?.linksWithID || {}).filter(([linkID, link]) =>
          link.from === nodeAtBoundaryR && isBoundaryNode(link.to, ruleFrom)
        )
        // TODO: add additional restrictions/weakening, notably in term of direction of the wire
        if (boundaries.length === 0) {
          throw new Error(`The node ${nodeAtBoundaryR} is not connected to a boundary node.`)
        }
      } else {
        // The link also ends inside the context: this link must be present in the bijection.
        if (linkAtoB?.[linkID] === undefined) {
          throw new Error(`The link ${linkID} has no equivalent in the rewritting rule.`)
        }
        // After the rewritting this node will be gone!
        linksToDelete.push(linkID)
      }
    }
  });
  // We remove the links
  linksToDelete.forEach((linkID) => {
    if (diagram?.linksWithID?.[linkID] === undefined) {
      throw new Error(`Impossible to delete ${linkID}, the link does not exist`)
    }
    delete diagram.linksWithID[linkID]
  })
  // We remove the old nodes
  Object.keys(nodesA).forEach((nodeID) => {
    if (diagram?.nodes?.[nodeID] === undefined) {
      throw new Error(`Impossible to delete node ${nodeID}, the node does not exist`)
    }
    delete diagram.nodes[nodeID]
  })
  // TODO: think about how to set the position of the new node (center of all other nodes?)
  // We add the new nodes
  nodesD.forEach((nodeID) => {
    if (diagram?.nodes?.[nodeID] !== undefined) {
      throw new Error(`Collision with the identifier ${nodeID} in rule and original diagram `)
    }
    // TODO
  })
  // We reconnect them to the boundary
}
