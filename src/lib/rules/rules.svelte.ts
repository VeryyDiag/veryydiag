import type { Diagram, ProofStep, Theory, NodeBijection, NodeID, LinkID, Link, LinkBijection, NodeKind, Rule, BoundaryName, IDAnchor } from "$lib/types/types" 
import { assertNotUndefined, assertNotUndefinedNR, areSetsEqual, assertDontThrow, fullAnchorToIDAndAnchor, recordIsBijection, assertTrue, listsAreBijection, values, keys, entries, inverseBijection, listsAreUniqueAndIdenticalSets, listIsUnique, IDAnchorToFullAnchor, errToUndef } from "$lib/utils.svelte" 
import { isBoundaryNode, nodeKindBoundaries, getBoundaryName, nbBoundaryLink, getBoundaryNameFromNode, paramAvailableTypes, checkParamType } from "$lib/types/types"
// MAYBETODO: rewrite this with OCaml and/or rust to link it with Rocq/Lean/…

export function checkTheory(theory: Theory) : true {
  // Check if the parameter specifications are properly defined
  entries(theory?.availableNodes).forEach(([nodeID, node]) => {
    entries(node?.paramSpecs).forEach(([paramName, paramSpecs]) => {
      // The type should be valid
      paramAvailableTypes.includes(paramSpecs?.type)
      // A default entry exists for each parameter
      assertNotUndefinedNR(paramSpecs?.default, `The parameter specification of ${paramName} should provide a default value`)
      // The default value has the proper type
      checkParamType(paramSpecs.type, paramSpecs.default)
      if (paramSpecs?.unique !== undefined) {
        assertTrue(typeof paramSpecs.unique === "boolean", `The 'unique' property of the parameter specification ${paramName} should be either the boolean true or false (currently: ${paramSpecs.unique})`)
      }
    })
  })
  return true
}

/** Check if a diagram is syntaxically correct (all links point to existing nodes etc).
 * Returns true if it is well formed, or throw an exception if not. You can disable tests of the theory if
 * you already know that it is correctly prepared (for efficiency reasons)
 */
export function checkDiagram(diagram: Diagram, theory: Theory, shouldCheckTheory:boolean = true) : true {
  if (shouldCheckTheory) {
    assertDontThrow(() => checkTheory(theory), `The theory is not well formed`)
  }
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
  // In diagrams, boundary nodes should have names
  entries(diagram?.nodes).map(([nodeID,node]) => {
    if (isBoundaryNode(nodeID, diagram)) {
      getBoundaryNameFromNode(nodeID, diagram, theory)
    }
  })
  // In diagrams, boundary nodes should have a single anchor called 'boundary'
  if (theory?.availableNodes?.boundary !== undefined) {
    assertNotUndefinedNR(theory.availableNodes.boundary?.anchors, `The 'boundary' node kind has no anchor while we expect exactly one anchor with name 'boundary'`)
    assertTrue(listsAreUniqueAndIdenticalSets(keys(theory.availableNodes.boundary.anchors), ["boundary"]),
               `The 'boundary' node kind should have a single anchor called 'boundary' while it has the following anchors: ${JSON.stringify(keys(theory.availableNodes.boundary.anchors))}`)
  }
  // In diagrams, boundary nodes should have at most one connected wire
  assertTrue(
    listIsUnique(entries(diagram?.linksWithID).map(([linkID,link]) => {
      const [fromNode, fromAnchor] = fullAnchorToIDAndAnchor(link.from)
      const [toNode, toAnchor] = fullAnchorToIDAndAnchor(link.to)
      return [errToUndef(() => getBoundaryNameFromNode(fromNode, diagram, theory)),
              errToUndef(() => getBoundaryNameFromNode(toNode, diagram, theory))].filter(x => x !== undefined)
    }).flat()),
    `The diagram has some boundary nodes connected to multiple wires`
  )
  // If a parameter is defined for a node, a paramSpec is also defined with appropriate type
  entries(diagram?.nodes).forEach(([nodeID, node]) => {
    entries(node?.params).forEach(([paramName, param]) => {
      const paramSpecs = assertNotUndefined(
        theory?.availableNodes?.[node.nodeKind]?.paramSpecs?.[paramName],
        `The parameter ${paramName} specified in ${nodeID} does not exist in the paramSpecs of the theory`
      )
      // Check if the type matches
      assertDontThrow(
        () => checkParamType(paramSpecs.type, param.value),
        `The parameter ${paramName} specified in the node ${nodeID} has a wrong type`
      )
    })
  })
  return true
}

export function checkRule(rule: Rule, theory: Theory, shouldCheckTheory: boolean = true) {
  if (shouldCheckTheory) {
    assertDontThrow(() => checkTheory(theory), `The theory is not well formed`)
  }
  const lhs = assertNotUndefined(rule.lhs, `The LHS of the rule is undefined.`)
  const rhs = assertNotUndefined(rule.rhs, `The RHS of the rule is undefined.`)
  assertDontThrow(() => checkDiagram(lhs, theory, false), `The diagram on the LHS side is not well formed`)
  assertDontThrow(() => checkDiagram(rhs, theory, false), `The diagram on the RHS side is not well formed`)
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
  // TODO: more explicit errors
  if (boundaryFromNamesSet.size !== boundaryFromNames.length) {
    throw new Error(`Some boundary names are specified multiple times in the starting rule`)
  }
  if (boundaryToNamesSet.size !== boundaryToNames.length) {
    throw new Error(`Some boundary names are specified multiple times in the ending rule`)
  }
  if (!areSetsEqual(boundaryFromNamesSet, boundaryToNamesSet)) {
    throw new Error(`You should have the same sets of boundary nodes in the right and left parts of the rule`)
  }
  return true
}

/** Make sure to provide a **copy** of the diagram if you want to keep it,
 * since we will remove nodes etc to create the new diagram */
export function proofApplyOneStep(diagram: Diagram, proofStep: ProofStep, theory: Theory) : Diagram {
  // I think I do redundant checks (earlier and when creating the graph)…
  // Anyway, better be safe for now ^^
  // TODO: more precise error messages (which element is wrong)
  // ========== First we check if the proofStep is well formed ==========
  assertDontThrow(() => checkTheory(theory), `The theory is not well formed`)
  const rule = assertNotUndefined(theory.rules?.[proofStep.ruleName], `The rule ${proofStep.ruleName} does not exist`)
  assertTrue((["lr", "rl"]).includes(proofStep.direction), `The proofStep direction should either be lr or rl, not ${proofStep.direction} `)
  assertNotUndefinedNR(rule?.lhs, `The rule ${proofStep.ruleName} has an undefined lhs`)
  assertNotUndefinedNR(rule?.rhs, `The rule ${proofStep.ruleName} has an undefined rhs`)
  assertDontThrow(() => checkRule(rule, theory, false), `The rule ${proofStep.ruleName} contained in the current proofStep is invalid`)
  const ruleFrom: Diagram = proofStep.direction === "lr" ? rule.lhs : rule.rhs;
  const ruleTo: Diagram = proofStep.direction === "lr" ? rule.rhs : rule.lhs;
  // Check if nodeBijection* is really a bijection and compute its inverse …
  const nodeBijectionAB = proofStep.nodeBijectionAB
  const nodeBijectionBA = assertDontThrow(() => inverseBijection(nodeBijectionAB), `nodeBijectionAB is not a bijection`)
  const nodeBijectionCD = proofStep.nodeBijectionCD
  const nodeBijectionDC = assertDontThrow(() => inverseBijection(nodeBijectionCD), `nodeBijectionCD is not a bijection`)
  // … same for links
  const linkBijectionAB = proofStep.linkBijectionAB
  const linkBijectionBA = assertDontThrow(() => inverseBijection(linkBijectionAB), `linkBijectionAB is not a bijection`)
  const linkBijectionCD = proofStep.linkBijectionCD
  const linkBijectionDC = assertDontThrow(() => inverseBijection(linkBijectionCD), `linkBijectionCD is not a bijection`)
  // List of nodes involved in the rule (resp. diagram) A -> B -> C -> D
  const nodesA : NodeID[] = keys(nodeBijectionAB)
  const nodesB : NodeID[] = keys(nodeBijectionBA)
  const nodesC : NodeID[] = keys(nodeBijectionCD)
  const nodesD : NodeID[] = keys(nodeBijectionDC)
  // ========== First we check if the proofStep is well formed ==========
  // ====== Nodes
  // === Nodes in the nodeBijectionAB exist in the diagram A…
  keys(nodeBijectionAB).forEach(nodeID => assertNotUndefined(
    diagram?.nodes?.[nodeID],
    `The node ${nodeID} specified in the input of nodeBijectionAB does not exist in the original diagram`)
  )
  // === … Nodes in the nodeBijectionAB exist in the rule diagram B…
  values(nodeBijectionAB).forEach(nodeID => assertNotUndefined(
    ruleFrom?.nodes?.[nodeID],
    `The node ${nodeID} specified in the output of nodeBijectionAB does not exist in the ${proofStep.direction === "lr" ? "LHS" : "RHS"} diagram of the rule`)
  )
  // === … Nodes in the nodeBijectionCD exist in the rule diagram C
  keys(nodeBijectionCD).forEach(nodeID => assertNotUndefined(
    ruleTo?.nodes?.[nodeID],
    `The node ${nodeID} specified in the input of nodeBijectionCD does not exist in the ${proofStep.direction === "lr" ? "RHS" : "LHS"}  diagram of the rule`)
  )
  // === Outputs of nodeBijectionAB is one-to-one mapping to nodes in B (except boundary nodes)…
  assertTrue(
    listsAreUniqueAndIdenticalSets(
      values(nodeBijectionAB),
      keys(ruleFrom?.nodes).filter(nodeID => !isBoundaryNode(nodeID, ruleFrom))
    ),
    `Some nodes exist in the starting rule but do not exist in the output of nodeBijectionAB`
  )
  // === … inputs of nodeBijectionCD is one-to-one mapping to nodes in C (except boundary nodes)…
  assertTrue(
    listsAreUniqueAndIdenticalSets(
      keys(nodeBijectionCD),
      keys(ruleTo?.nodes).filter(nodeID => !isBoundaryNode(nodeID, ruleTo))
    ),
    `Some nodes exist in the ending rule but do not exist in the input of nodeBijectionCD`
  )
  // ====== Links
  // === links in the linkBijectionAB exist in the diagram A…
  keys(linkBijectionAB).forEach(linkID => assertNotUndefined(
    diagram?.linksWithID?.[linkID],
    `The link ${linkID} specified in the input of linkBijectionAB does not exist in the original diagram`)
  )
  // === Links in the linkBijectionAB exist in the diagram A…
  keys(linkBijectionAB).forEach(linkID => assertNotUndefined(
    diagram?.linksWithID?.[linkID],
    `The link ${linkID} specified in the input of linkBijectionAB does not exist in the original diagram`)
  )
  // === … Links in the linkBijectionAB exist in the rule diagram B…
  values(linkBijectionAB).forEach(linkID => assertNotUndefined(
    ruleFrom?.linksWithID?.[linkID],
    `The link ${linkID} specified in the output of linkBijectionAB does not exist in the ${proofStep.direction === "lr" ? "LHS" : "RHS"} diagram of the rule`)
  )
  // === … Links in the linkBijectionCD exist in the rule diagram C
  keys(linkBijectionCD).forEach(linkID => assertNotUndefined(
    ruleTo?.linksWithID?.[linkID],
    `The link ${linkID} specified in the input of linkBijectionCD does not exist in the ${proofStep.direction === "lr" ? "RHS" : "LHS"}  diagram of the rule`)
  )
  // === Outputs of linkBijectionAB is one-to-one mapping to links in B (except boundary links)…
  assertTrue(
    listsAreUniqueAndIdenticalSets(
      values(linkBijectionAB),
      keys(ruleFrom?.linksWithID).filter(linkID => nbBoundaryLink(linkID, ruleFrom, theory) === 0)
    ),
    `Some links exist in the starting rule but do not exist in the output of linkBijectionAB`
  )
  // === … inputs of linkBijectionCD is one-to-one mapping to links in C (except boundary links)…
  assertTrue(
    listsAreUniqueAndIdenticalSets(
      keys(linkBijectionCD),
      keys(ruleTo?.linksWithID).filter(linkID => nbBoundaryLink(linkID, ruleTo, theory) === 0)
    ),
    `Some links exist in the ending rule but do not exist in the input of linkBijectionCD`
  )
  // === Boundary nodes should not appear in the bijection…
  assertTrue(
    keys(nodeBijectionAB).filter(nodeID => isBoundaryNode(nodeID, diagram)).length > 0,
    `Boundary nodes are not allowed in the input of nodeBijectionAB`
  )
  // … (in either ends)
  assertTrue(
    keys(nodeBijectionBA).filter(nodeID => isBoundaryNode(nodeID, ruleFrom)).length > 0,
    `Boundary nodes are not allowed in the output of nodeBijectionAB`
  )
  // … also for nodeBijection CD
  assertTrue(
    keys(nodeBijectionCD).filter(nodeID => isBoundaryNode(nodeID, ruleTo)).length > 0,
    `Boundary nodes are not allowed in the input of nodeBijectionCD`
  )
  
  // TODO: check link direction etc + the existance of a node with the same name does not guarantee that they have equal
  // nodeKind, params etc

  // ====== boundaryLinksDr
  // === Check if all boundary links exist in the input diagram
  keys(proofStep.boundaryLinksDR).forEach(linkID => assertNotUndefined(diagram?.linksWithID?.[linkID], `The link ${linkID} specified in boundaryLinksDR does not exist in the input diagram`))
  // === TODO: check same direction etc
  // === Check if boundaryLinksDR map to an existing boundaryNode in the rule
  const boundaryNamesB = new Set(
    entries(ruleFrom?.nodes).map(([nodeID, node]) => getBoundaryName(node, theory)).filter(x => x !== undefined)
  )
  entries(proofStep.boundaryLinksDR).forEach(([linkID, boundaryNames]) => {
    assertTrue(
      boundaryNames?.from !== undefined || boundaryNames?.to !== undefined,
      `The link ${linkID} specifies in boundaryLinksDR neither the 'from' nor 'to' field.`
    )
    assertTrue(
      boundaryNames?.from === undefined || boundaryNamesB.has(boundaryNames.from),
      `The link ${linkID} comes, according to boundaryLinksDR, from a boundary ${boundaryNames?.from} that does not exist in the from rule`
    )
    assertTrue(
      boundaryNames?.to === undefined || boundaryNamesB.has(boundaryNames.to),
      `The link ${linkID} points, according to boundaryLinksDR, to a boundary ${boundaryNames?.to} that does not exist in the from rule`
    )
  })
  // No need to check this on the boundaryNamesC since we checked earlier (checkRule) that they have the same set of boundaryNames
  // TODO: deal with nodes not accepting multiple inputs
  
  
  // Instructions to delete/rewire/etc We avoid to remove in the loop in case it disturbs the process.
  let linksToDelete : LinkID[] = []
  const boundaryLinks = new Set(keys(proofStep.boundaryLinksDR))
  // All links are either boundary links, outside current rewriting region, or listed in the bijection
  // (here we want to prevent e.g. a wire between two nodes in the rewriting region where this list is not listed in node/linkBijection)
  Object.entries((diagram?.linksWithID || {})).forEach(([linkID, link]) => {    
    // Check if the link is inside the rewriting region (i.e. rule applies to current link)
    const [fromNode, fromAnchor] = fullAnchorToIDAndAnchor(link.from)
    const [toNode, toAnchor] = fullAnchorToIDAndAnchor(link.to)
    if (!nodesA.includes(fromNode)) {
      // The link does NOT start inside the rewriting region
      if (!nodesA.includes(toNode)) {
        // The link does NOT end inside the rewriting region: this link is therefore not concerned by this rule
        // hence we do nothing. We still check that it does not appear in the boundaryLinks
        assertTrue(
          !boundaryLinks.has(linkID),
          `The link ${linkID} appears in the diagram and in boundaryLinksDR but neither ends of the link are in the input of nodeBijectionAB`
        )
      } else {
        // The link ends inside the rewriting region. Hence this node is next to the boundary
        // Check if it appears in boundaryLinksAB
        assertTrue(
          boundaryLinks.has(linkID),
          `The link ${linkID} seems to be in the boundary of the rewriting region as its destination appears in nodeBijectionAB, but the link does not appear in boundaryLinksDR`
        )
      }
    } else {
      // The link starts inside the rule region
      if (!nodesA.includes(toNode)) {
        // The link ends outside the rule region: this node is next to the boundary
        // Check if it appears in boundaryLinksAB
        assertTrue(
          boundaryLinks.has(linkID),
          `The link ${linkID} seems to be in the boundary of the rewriting region as its source appears in nodeBijectionAB, but the link does not appear in boundaryLinksDR`
        )
      } else {
        // The link also ends inside the rewriting region: this link must be present in the bijection.
        assertNotUndefinedNR(
          linkBijectionAB?.[linkID],
          `The link ${linkID} appears to be in the rewriting region (from/to belongs to nodeBijectionAB) but it does not appear in linkBijectionAB, meaning that we don't know how to map it to its corresponding node in the rule.`
        )
      }
    }
  });
  // TODO: check things related to multiwire etc
  // We remove the links
  keys(linkBijectionAB).forEach((linkID) => {
    assertNotUndefinedNR(
      diagram?.linksWithID?.[linkID],
      `Impossible to delete ${linkID} (from linkBijectionAB) since the link does not exist in the diagram.`
    )
    delete diagram.linksWithID[linkID]
  })
  // We remove the old nodes
  nodesA.forEach((nodeID) => {
    assertNotUndefinedNR(
      diagram?.nodes?.[nodeID],
      `Impossible to delete node ${nodeID}, the node does not exist`
    )
    delete diagram.nodes[nodeID]
  })
  // We add the new nodes
  entries(ruleTo?.nodes).forEach(([nodeID, node]) => {
    // We don't add the boundary nodes, they will already be present
    if (isBoundaryNode(nodeID, ruleTo)) {
      return
    }
    const newNodeID = assertNotUndefined(nodeBijectionCD?.[nodeID], `The node ${nodeID} present in the ending rule diagram is not present in ${nodeBijectionCD}`)
    assertTrue(
      diagram?.nodes?.[newNodeID] === undefined,
      `Collision with the identifier ${newNodeID} in rule and original diagram. Rename the node in nodeBijectionCD to make sure it is unique.`
    )
    if (diagram?.nodes === undefined) {
      diagram.nodes = {}
    }
    diagram.nodes[newNodeID] = node;
    // TODO: think about how to set the position of the new node (center of all other nodes?)
  })
  // We add the links of the new rule
  entries(ruleTo?.linksWithID).forEach(([linkID, link]) => {
    const [fromNode, fromAnchor] = fullAnchorToIDAndAnchor(link.from)
    const [toNode, toAnchor] = fullAnchorToIDAndAnchor(link.to)
    const newLinkID = assertNotUndefined(
      proofStep?.linkBijectionCD[linkID],
      `The ${linkID} does not exist in linkBijectionCD, how should we translate it to the new diagram?`
    )
    assertTrue(
      diagram?.linksWithID?.[newLinkID] === undefined,
      `Collision with the identifier ${newLinkID} in rule and original diagram. Rename the link in linkBijectiontTo to make sure it is unique.`
    )
    const nLink = nbBoundaryLink(linkID, ruleTo, theory)
    if (nLink > 0) {
      // Boundary links. We will take care of them later (but still check)
      return
    } else {
      // We add the regular links not involving the boundary
      if (diagram?.linksWithID === undefined) {
        diagram.linksWithID = {}
      }
      diagram.linksWithID[newLinkID] = {
        ...link,
        from: IDAnchorToFullAnchor(
          assertNotUndefined(
            proofStep?.nodeBijectionCD?.[fromNode],
            `The node ${fromNode} does not exist in the source of nodeBijectionCD`
          ),
          fromAnchor
        ),
        to: IDAnchorToFullAnchor(
          assertNotUndefined(
            proofStep?.nodeBijectionCD?.[link.to],
            `The node ${toNode} does not exist in the source of nodeBijectionCD`
          ),
          toAnchor
        )
      };
    }
  })
  // === For efficiency reasons, we first map boundary names to full anchor in the final graph
  // (we only consider nodes that have a single boundary node)
  const boundaryNameToFullAnchorD : Record<BoundaryName, {
    /** Name of the node/anchor in the final graph to connect to given a node whose boundary name is the input of this record */
    fullAnchorD: IDAnchor,
    /** Specify if the link is entering the rule (true) or leaving the rule (false) */
    incomingLink: boolean
  }> = Object.fromEntries(entries(ruleTo?.linksWithID).map(([linkID, link]) => {
    const n = nbBoundaryLink(linkID, ruleTo, theory)
    if (n === 0 || n === 3) {
      return undefined
    }
    if (n === 1) {
      const boundaryName = getBoundaryNameFromNode(link.from, ruleTo, theory)
      const [node, anchor] = fullAnchorToIDAndAnchor(link.to)
      return [boundaryName, {
        fullAnchorD: IDAnchorToFullAnchor(
          nodeBijectionCD[node],
          anchor
        ),
        incomingLink: true,
      }]
    } else {
      const boundaryName = getBoundaryNameFromNode(link.to, ruleTo, theory)
      const [node, anchor] = fullAnchorToIDAndAnchor(link.from)
      return [boundaryName, {
        fullAnchorD: IDAnchorToFullAnchor(
          nodeBijectionCD[node],
          anchor
        ),
        incomingLink: false,
      }]
    }
  }).filter(x => x !== undefined))
  // === We add back the boundary links
  entries(proofStep?.boundaryLinksDR).forEach(([linkID, boundaryLinks]) => {
    assertNotUndefinedNR(
      diagram?.linksWithID?.[linkID],
      `The boundary link ${linkID} specified in boundaryLinksDR does not exist on the starting diagram`
    )
    const link = diagram.linksWithID[linkID]
    const [fromNode, fromAnchor] = fullAnchorToIDAndAnchor(link.from)
    const [toNode, toAnchor] = fullAnchorToIDAndAnchor(link.to)
    if (boundaryLinks?.from !== undefined && boundaryLinks?.to !== undefined) {
      // Both 'from' and 'to' are specified.
      // TODO
    } else if (boundaryLinks?.from === undefined && boundaryLinks?.to !== undefined) {
      // We need to rename the "from"
      diagram.linksWithID[linkID].from = boundaryNameToFullAnchorD[boundaryLinks.to].fullAnchorD
    } else if (boundaryLinks?.to === undefined && boundaryLinks.from !== undefined) {
      // We need to rename the "to"
      diagram.linksWithID[linkID].to = boundaryNameToFullAnchorD[boundaryLinks.from].fullAnchorD
    } else {
      // Neither 'from' nor 'to' are specified
      throw new Error(`boundaryLinksDR does not specify a boundary name for the link entry ${linkID}`)
    }
  })
  // TODO: check link direction/type/?
  assertDontThrow(() => checkDiagram(diagram, theory, false), `The final diagram is not well formed`)
  return diagram
}
