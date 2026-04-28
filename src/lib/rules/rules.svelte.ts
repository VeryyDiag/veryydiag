import type { Diagram, ProofStep, Theory, NodeBijection, NodeID, LinkID, Link, LinkBijection, NodeKind, Rule } from "$lib/types/types" 
import { assertNotUndefined, assertNotUndefinedNR, areSetsEqual, assertDontThrow } from "$lib/utils.svelte" 
import { isBoundaryNode, nodeKindBoundaries, getBoundaryName } from "$lib/types/types"
import { fullAnchorToIDAndAnchor } from "$lib/utils.svelte" 
// MAYBETODO: rewrite this with OCaml and/or rust to link it with Rocq/Lean/…

/** Check if a diagram is syntaxically correct (all links point to existing nodes etc).
 * Returns true if it is well formed, or throw an exception if not.
 */
export function checkDiagram(diagram: Diagram, theory: Theory) : true {
  // Check if all nodeKinds exist in the theory
  Object.entries((diagram?.nodes || {})).forEach(([nodeID, node]) => {
    if ((theory?.availableNodes || {})?.[node.nodeKind] === undefined) {
      throw new Error(`The nodeKind ${node.nodeKind} for node ${nodeID} does not exist in the theory.`)
    }
  })
  // Check if all links are properly formed
  Object.entries((diagram?.linksWithID || {})).forEach(([linkID, link]) => {
    const [nodeFrom, anchorFrom] = fullAnchorToIDAndAnchor(link.from)
    if (diagram?.nodes?.[nodeFrom] === undefined) {
      throw new Error(`The source node ${nodeFrom} does not exist in the link ${linkID}`)
    }
    if (theory?.availableNodes?.[diagram?.nodes?.[nodeFrom].nodeKind]?.anchors?.[anchorFrom] === undefined) {
      throw new Error(`The anchor ${anchorFrom} in the source node ${nodeFrom} does not exist in the link ${linkID}`)
    }
    const [nodeTo, anchorTo] = fullAnchorToIDAndAnchor(link.to)
    if (diagram?.nodes?.[nodeTo] === undefined) {
      throw new Error(`The destination node ${nodeTo} does not exist in the link ${linkID}`)
    }
    if (theory?.availableNodes?.[diagram?.nodes?.[nodeTo].nodeKind]?.anchors?.[anchorTo] === undefined) {
      throw new Error(`The anchor ${anchorTo} in the source node ${nodeTo} does not exist in the link ${linkID}`)
    }
  })
  // TODO: check if all parameters have good types etc
  return true
}

export function checkRule(rule: Rule, theory: Theory) {
  const lhs = assertNotUndefined(rule.lhs, `The LHS of the rule is undefined.`)
  const rhs = assertNotUndefined(rule.rhs, `The RHS of the rule is undefined.`)
  assertDontThrow(() => checkDiagram(lhs, theory), `The diagram on the LHS side is not well formed`)
  assertDontThrow(() => checkDiagram(rhs, theory), `The diagram on the RHS side is not well formed`)
  // We check if both rules have the same boundary, and all boundaries have unique names
  const boundaryFrom = Object.entries(lhs?.nodes || {}).map(([nodeID, node]) => {
    if (isBoundaryNode(nodeID, lhs)) {
      return node
    }
    return undefined
  }).filter(x => x !== undefined)
  const boundaryFromNames = boundaryFrom.map(n => getBoundaryName(n, theory)).filter(x => x !== undefined)
  const boundaryFromNamesSet = new Set(boundaryFromNames)
  const boundaryTo = Object.entries(rhs?.nodes || {}).map(([nodeID, node]) => {
    if (isBoundaryNode(nodeID, rhs)) {
      return node
    }
    return undefined
  }).filter(x => x !== undefined)
  const boundaryToNames = boundaryTo.map(n => getBoundaryName(n, theory)).filter(x => x !== undefined)
  const boundaryToNamesSet = new Set(boundaryToNames)
  // TODO: more explicit 
  if (boundaryFromNamesSet.size !== boundaryFromNames.length) {
    throw new Error(`Some boundary nodes are specified multiple times in the starting rule`)
  }
  if (boundaryToNamesSet.size !== boundaryToNames.length) {
    throw new Error(`Some boundary nodes are specified multiple times in the ending rule`)
  }
  if (!areSetsEqual(boundaryFromNamesSet, boundaryToNamesSet)) {
    throw new Error(`You should have the same sets of boundary nodes in the right and left parts of the rule`)
  }
}

/** Make sure to provide a **copy** of the diagram if you want to keep it,
 * since we will remove nodes etc to create the new diagram */
export function proofApplyOneStep(diagram: Diagram, proofStep: ProofStep, theory: Theory): Diagram {
  // TODO: check if diagrams/rules are well formed (all links points to existing links etc),
  // both as input and output
  const rule = assertNotUndefined(theory.rules?.[proofStep.ruleName], `The rule ${proofStep.ruleName} does not exist`)
  assertNotUndefinedNR(rule?.lhs, `The rule ${proofStep.ruleName} has an undefined lhs`)
  assertNotUndefinedNR(rule?.rhs, `The rule ${proofStep.ruleName} has an undefined rhs`)
  assertDontThrow(() => checkRule(rule, theory), `The rule ${proofStep.ruleName} contained in the current proofStep is invalid`)
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
      // The link starts inside the rule context
      if (!nodesA.includes(toNode)) {
        // The link ends outside the rule context: this node is next to the boundary
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
  // We add the new nodes
  Object.entries(ruleTo?.nodes || {}).forEach(([nodeID, node]) => {
    const newNodeID = proofStep.nodeBijectionTo[nodeID]
    if (diagram?.nodes?.[newNodeID] !== undefined) {
      throw new Error(`Collision with the identifier ${newNodeID} in rule and original diagram. Rename the node in nodeBijectiontTo to make sure it is unique.`)
    }
    // We don't add the boundary nodes, they will already be present
    if (isBoundaryNode(nodeID, ruleTo)) {
      return
    }
    if (diagram?.nodes === undefined) {
      diagram.nodes = {}
    }
    diagram.nodes[newNodeID] = node;
    // TODO: think about how to set the position of the new node (center of all other nodes?)
  })
  // We add the links of the new rule
  Object.entries(ruleTo?.linksWithID || {}).forEach(([linkID, link]) => {
    const newLinkID = proofStep.linkBijectionTo[linkID]
    if (diagram?.linksWithID?.[newLinkID] !== undefined) {
      throw new Error(`Collision with the identifier ${newLinkID} in rule and original diagram. Rename the link in linkBijectiontTo to make sure it is unique.`)
    }
    if (isBoundaryNode(link.from, ruleTo) || isBoundaryNode(link.to, ruleTo)) {
      // We add the links involving the boundary
      // const fromNode = isBoundaryNode(link.from, ruleTo) ? TODO : [ link.from ]
      // TODO
      return
    } else {
      // We add the regular links not involving the boundary
      if (diagram?.linksWithID === undefined) {
        diagram.linksWithID = {}
      }
      diagram.linksWithID[newLinkID] = link;
    }
  })
  return diagram
}
