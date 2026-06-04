import type { Diagram, ProofStepApplyRule, Theory, NodeBijection, NodeID, LinkID, Link, LinkBijection, NodeKind, Rule, BoundaryName, IDAnchor, BoundaryLinks, ProofStepMove, ProofStep, AnchorName } from "$lib/types/types"
import { assertNotUndefined, assertNotUndefinedNR, assertDontThrow, fullAnchorToIDAndAnchor, assertTrue, listsAreBijection, values, keys, entries, inverseBijection, listsAreUniqueAndIdenticalSets, listIsUnique, IDAnchorToFullAnchor, errToUndef, listsAreUniqueAndIdenticalSetsThrow, assertNever, listsAreNotOverlapping, listHasNoDuplicateE, listsAreEqualUpToOrdering } from "$lib/utils"
import { isBoundaryNodeID, nodeKindBoundaries, getBoundaryName, nbBoundaryLink, getBoundaryNameFromNode, paramAvailableTypes, checkParamType, ProofDiagError, isBoundaryNode, equivalentNodes, nbMultiWireBoundaryLink, isMonoWireBoundaryNode, isMultiWireBoundaryNodeID, isMultiWireBoundaryNode, multiWireBoundaryNameToIdAnchor, nbMonoWireBoundaryLink, idAnchorToMultiWireBoundaryName, isMonoWireBoundaryNodeID } from "$lib/types/types"
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
  entries(diagram?.nodes).forEach(([nodeID, node]) => {
    assertNotUndefinedNR(
      (theory?.availableNodes || {})?.[node?.nodeKind],
      `The nodeKind ${node?.nodeKind} for node ${nodeID} does not exist in the theory.`
    )
    // Node names should not contain a dot
    assertTrue(!nodeID.includes("."),
               `The node ${nodeID} contains a dot (.) while this should be forbidden`
    )
  })
  // Check if all links are properly formed
  entries(diagram?.linksWithID).forEach(([linkID, link]) => {
    const [nodeFrom, anchorFrom] = fullAnchorToIDAndAnchor(
      assertNotUndefined(
        link.from,
        `The link ${linkID} has no 'from' entry`
    ))
    assertNotUndefinedNR(
      diagram?.nodes?.[nodeFrom],
      `The source node ${nodeFrom} does not exist in the link ${linkID}`
    )
    assertNotUndefinedNR(
      theory?.availableNodes?.[diagram?.nodes?.[nodeFrom]?.nodeKind]?.anchors?.[anchorFrom],
      `The anchor ${anchorFrom} in the source node ${nodeFrom} does not exist in the link ${linkID}`
    )
    const [nodeTo, anchorTo] = fullAnchorToIDAndAnchor(
      assertNotUndefined(
        link.to,
        `The link ${linkID} has no 'to' entry`
    ))
    assertNotUndefinedNR(
      diagram?.nodes?.[nodeTo],
      `The destination node ${nodeTo} does not exist in the link ${linkID}`
    )
    assertNotUndefinedNR(
      theory?.availableNodes?.[diagram?.nodes?.[nodeTo]?.nodeKind]?.anchors?.[anchorTo],
      `The anchor ${anchorTo} in the source node ${nodeTo} does not exist in the link ${linkID}`
    )
    // Check if multi-wire boundary nodes are not connected to single-boundary nodes
    const nbMulti = nbMultiWireBoundaryLink(linkID, diagram, theory);
    const nbMono = nbMonoWireBoundaryLink(linkID, diagram, theory);
    assertTrue(nbMulti === 0 || nbMono === 0,
               `The link ${linkID} is linked to both a mono-wire boundary link and a multi-wire boundary link. This is forbidden.`
    )
    assertTrue(nbMulti !== 3,
               `The link ${linkID} is linked to two multi-wire boundary link. This is forbidden (no clear semantic).`
    )
  })
  // In diagrams, boundary nodes should have names
  entries(diagram?.nodes).map(([nodeID,node]) => {
    if (isBoundaryNodeID(nodeID, diagram)) {
      getBoundaryNameFromNode(nodeID, diagram, theory)
    }
  })
  // In diagrams, boundary nodes should have a single anchor called 'boundary'
  if (theory?.availableNodes?.boundary !== undefined) {
    assertNotUndefinedNR(theory.availableNodes.boundary?.anchors, `The 'boundary' node kind has no anchor while we expect exactly one anchor with name 'boundary'`)
    assertTrue(listsAreUniqueAndIdenticalSets(keys(theory.availableNodes.boundary.anchors), ["boundary"]),
               `The 'boundary' node kind should have a single anchor called 'boundary' while it has the following anchors: ${JSON.stringify(keys(theory.availableNodes.boundary.anchors))}`)
  }
  // In diagrams, each multi-wire boundary nodes should have exactly one connected wire
  assertDontThrow(
    () => listsAreUniqueAndIdenticalSetsThrow(
      // Lists of pointed boundary (must be unique)
      entries(diagram?.linksWithID).map(([linkID,link]) => {
        const [fromNode, fromAnchor] = fullAnchorToIDAndAnchor(link.from)
        const [toNode, toAnchor] = fullAnchorToIDAndAnchor(link.to)
        const a = isMultiWireBoundaryNodeID(fromNode, diagram, theory)
        const b = isMultiWireBoundaryNodeID(toNode, diagram, theory)
        assertTrue(!(a && b), `The link ${linkID} is connected to two multi-wire boundary nodes ${fromNode} and ${toNode}`)
        return [errToUndef(() => a ? getBoundaryNameFromNode(fromNode, diagram, theory) : undefined),
                errToUndef(() => b ? getBoundaryNameFromNode(toNode, diagram, theory) : undefined)].filter(x => x !== undefined)
      }).flat(),
      // Lists of boundaries
      entries(diagram?.nodes).map(([nodeID, node]) => {
        if(isMultiWireBoundaryNode(node, theory)) {
          return getBoundaryNameFromNode(nodeID, diagram, theory)
        } else {
          return undefined
        }
      }).filter(x => x !== undefined)
    ),
    `The diagram has issues with multi-wire boundary nodes: they should have unique names, and be connected to exactly one node. Next comes the difference between pointed boundaries vs actual boundaries`
  )
  // All boundary nodes should be different (between mono and multi-wire as well)
  assertDontThrow(
    () => listHasNoDuplicateE(
      entries(diagram?.nodes).map(([nodeID, node]) => {
        if(isBoundaryNode(node)) {
          return getBoundaryNameFromNode(nodeID, diagram, theory)
        } else {
          return undefined
        }
      }).filter(x => x !== undefined)),
    `Boundary nodes should all have different names in a diagram`)
  // If a parameter is defined for a node, a paramSpec is also defined with appropriate type
  entries(diagram?.nodes).forEach(([nodeID, node]) => {
    entries(node?.params).forEach(([paramName, param]) => {
      const paramSpecs = assertNotUndefined(
        theory?.availableNodes?.[node?.nodeKind]?.paramSpecs?.[paramName],
        `The parameter ${paramName} specified in ${nodeID} does not exist in the paramSpecs of the theory`
      )
      assertNotUndefined(param?.value, `The parameter ${paramName} should specify its value via a 'value' field. Have you forgotten this field?`)
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
    if (isBoundaryNodeID(nodeID, lhs)) {
      return node
    }
    return undefined
  }).filter(x => x !== undefined)
  const boundaryFromNames = boundaryFrom.map(n => getBoundaryName(n, theory)).filter(x => x !== undefined)
  const boundaryTo = Object.entries(rhs?.nodes || {}).map(([nodeID, node]) => {
    if (isBoundaryNodeID(nodeID, rhs)) {
      return node
    }
    return undefined
  }).filter(x => x !== undefined)
  const boundaryToNames = boundaryTo.map(n => getBoundaryName(n, theory)).filter(x => x !== undefined)
  assertDontThrow(
    () => listsAreUniqueAndIdenticalSetsThrow(boundaryFromNames, boundaryToNames),
    `You should have the same sets of boundary nodes in the right and left parts of the rule`
  )
  // TODO: check same set of mono and multi-boundary nodes, with same properties etc.
  return true
}

/** Applies one step of kind "move" */
export function proofApplyMove(diagramOrig: Diagram, proofStep: ProofStepMove | ProofStepApplyRule, dontCopyDiagram : boolean = false) {
  let diagram = dontCopyDiagram ? diagramOrig : structuredClone(diagramOrig);
  entries(proofStep?.move).forEach(([nodeID, pos]) => {
    assertNotUndefinedNR(diagram?.nodes?.[nodeID],
                         `The nodeID ${nodeID} does not exist in the diagram when applying the proofStep 'move'`)
    diagram.nodes[nodeID].pos = pos
  })
  return diagram
}


/** Applies one step of kind "applyRule" */
export function proofApplyRule(diagramOrig: Diagram, proofStep: ProofStepApplyRule, theory: Theory, dontCopyDiagram : boolean = false) : Diagram {
  let diagram = dontCopyDiagram ? diagramOrig : structuredClone(diagramOrig)
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
  const ruleFromName: string = proofStep.direction === "lr" ? "starting (LHS)" : "starting (RHS)";
  const ruleToName: string = proofStep.direction === "lr" ? "ending (RHS)" : "ending (LHS)";
  // Check if nodeBijection* is really a bijection and compute its inverse …
  const nodeBijectionAB = proofStep?.nodeBijectionAB || {}
  const nodeBijectionBA = assertDontThrow(() => inverseBijection(nodeBijectionAB), `nodeBijectionAB is not a bijection`)
  const boundaryAnchorsBA  = proofStep?.boundaryAnchorsBA || {}
  const nodeBijectionCD = proofStep?.nodeBijectionCD || {}
  const nodeBijectionDC = assertDontThrow(() => inverseBijection(nodeBijectionCD), `nodeBijectionCD is not a bijection`)
  // … same for links
  const linkBijectionAB = proofStep?.linkBijectionAB || {}
  const linkBijectionBA = assertDontThrow(() => inverseBijection(linkBijectionAB), `linkBijectionAB is not a bijection`)
  const linkBijectionCD = proofStep?.linkBijectionCD || {}
  const linkBijectionDC = assertDontThrow(() => inverseBijection(linkBijectionCD), `linkBijectionCD is not a bijection`)
  // List of nodes involved in the rule (resp. diagram) A -> B -> C -> D
  const nodesA : NodeID[] = keys(nodeBijectionAB)
  const nodesB : NodeID[] = keys(nodeBijectionBA)
  const nodesC : NodeID[] = keys(nodeBijectionCD)
  const nodesD : NodeID[] = keys(nodeBijectionDC)
  // ========== First we check if the proofStep is well formed ==========
  // ====== Nodes
  // === Nodes in the nodeBijectionAB exist in the diagram A…
  entries(nodeBijectionAB).forEach(([nodeIDA, nodeIDB]) => {
    const nodeA = assertNotUndefined(
      diagram?.nodes?.[nodeIDA],
      `The node '${nodeIDA}' specified in the input of nodeBijectionAB does not exist in the original diagram which contains ${JSON.stringify(keys(diagram?.nodes))}`
    )

    // === … Nodes in the nodeBijectionAB exist in the rule diagram B…
    const nodeB = assertNotUndefined(
      ruleFrom?.nodes?.[nodeIDB],
      `The node ${nodeIDB} specified in the output of nodeBijectionAB does not exist in the ${proofStep.direction === "lr" ? "LHS" : "RHS"} diagram of the rule`
    )

    // === Both nodes have the same kind
    assertTrue(
      nodeA?.nodeKind === nodeB?.nodeKind && nodeA?.nodeKind !== undefined,
      `The node ${nodeIDA} in the diagram should have the same nodeKind (${nodeA?.nodeKind}) as the corresponding node ${nodeIDB} in the rule (with nodeKind ${nodeB?.nodeKind})`
    )
    // TODO: check if parameters are identical
  })
  // === … Anchors in the boundaryAnchorsBA exist in the rule diagram B and A, correspond to a mono-wire boundary nodes, and are
  // not already part of the rewritting region.
  entries(boundaryAnchorsBA).forEach(([idAnchorB, idAnchorA]) => {
    const [nodeID, anchor] = fullAnchorToIDAndAnchor(idAnchorB);
    const node = assertNotUndefined(
      ruleFrom?.nodes?.[nodeID],
      `The node ${nodeID} specified in the input of boundaryAnchorsBA does not exist in the ${proofStep.direction === "lr" ? "LHS" : "RHS"} diagram of the rule which contains ${JSON.stringify(keys(ruleFrom?.nodes))}`)
    const nodeKind = assertNotUndefined(ruleFrom?.nodes?.[nodeID]?.nodeKind, `The node ${nodeID} has no nodeKind`)
    assertNotUndefined(
      keys(theory?.availableNodes?.[nodeKind]?.anchors).includes(anchor),
      `We can't find the anchor ${anchor} for the node ${nodeID} (with nodeKind ${ruleFrom?.nodes?.[nodeID]?.nodeKind}) specified in the input of boundaryAnchorsBA. Available anchors = ${JSON.stringify(keys(theory?.availableNodes?.[nodeKind]?.anchors))}`)
    assertTrue(
      isMonoWireBoundaryNode(node, theory),
      `The node ${nodeID} specified in the input of boundaryAnchorsBA is not a mono-wire boundary node.`
    )

    const [nodeIDA, anchorA] = fullAnchorToIDAndAnchor(idAnchorA);
    const nodeA = assertNotUndefined(
      diagram?.nodes?.[nodeIDA],
      `The node ${nodeIDA} specified in the input of boundaryAnchorsBA does not exist in the original diagram which contains ${JSON.stringify(keys(diagram?.nodes))}`)
    const nodeKindA = assertNotUndefined(nodeA?.nodeKind, `Missing nodeKind on node ${nodeIDA}`)
    assertNotUndefined(
      keys(theory?.availableNodes?.[nodeKindA]?.anchors).includes(anchorA),
      `We can't find the anchor ${anchorA} for the node ${nodeIDA} (with nodeKind ${nodeKindA}) specified in the output of boundaryAnchorsBA. Available anchors = ${JSON.stringify(keys(theory?.availableNodes?.[nodeKindA]?.anchors))}`)

  })
  // === … Nodes in the nodeBijectionCD exist in the rule diagram C
  keys(nodeBijectionCD).forEach(nodeID => assertNotUndefined(
    ruleTo?.nodes?.[nodeID],
    `The node ${nodeID} specified in the input of nodeBijectionCD does not exist in the ${proofStep.direction === "lr" ? "RHS" : "LHS"}  diagram of the rule`)
  )
  // === Outputs of nodeBijectionAB is one-to-one mapping to nodes in B (except boundary nodes)…
  assertDontThrow(
    () => listsAreUniqueAndIdenticalSetsThrow(
      values(nodeBijectionAB),
      keys(ruleFrom?.nodes).filter(nodeID => !isBoundaryNodeID(nodeID, ruleFrom))),
    `Some nodes exist in the ${ruleFromName} diagram rule but do not exist in the output of nodeBijectionAB`
  )
  // === … inputs of nodeBijectionCD is one-to-one mapping to nodes in C (except boundary nodes)…
  assertDontThrow(
    () => listsAreUniqueAndIdenticalSetsThrow(
      keys(nodeBijectionCD),
      keys(ruleTo?.nodes).filter(nodeID => !isBoundaryNodeID(nodeID, ruleTo))
    ),
    `Some nodes exist in the ending rule but do not exist in the input of nodeBijectionCD`
  )
  // ====== Links
  // TODO: check if boundaryAnchorsBA only contains node that are mono-boundary.
  // === links in the linkBijectionAB exist in the diagram A…
  entries(linkBijectionAB).forEach(([linkIDA, linkIDB]) => {
    assertDontThrow(() => {
      const linkA = assertNotUndefined(
        diagram?.linksWithID?.[linkIDA],
        `The link ${linkIDA} specified in the input of linkBijectionAB does not exist in the original diagram`
      )

      // === … Links in the linkBijectionAB exist in the rule diagram B…
      const linkB = assertNotUndefined(
        ruleFrom?.linksWithID?.[linkIDB],
        `The link ${linkIDB} specified in the output of linkBijectionAB does not exist in the ${proofStep.direction === "lr" ? "LHS" : "RHS"} diagram of the rule`
      )

      // Check if the links in linkBijectionAB are equivalent up to translation, i.e. pointing to/from
      // the same node inside the diagram. Special care must be taken for mono-wire boundary nodes,
      // so we use boundaryAnchorsBA to do the translation.
      // Links are always considered undirected/without kinds since we can fake a directed
      // link/kind via two undirected links connected to a special node with two anchors (directed)
      // or one anchor (undirected).
      const [nodeFromB, anchorFromB] = fullAnchorToIDAndAnchor(linkB.from)
      const translatedLinkBFromA = boundaryAnchorsBA?.[linkB.from] || IDAnchorToFullAnchor(
        assertNotUndefined(
          nodeBijectionBA?.[nodeFromB],
          `The node ${nodeFromB} in the ${ruleFromName} diagram of the rule is not present in nodeBijectionBA nor in boundaryAnchorsBA (${linkB.from} should appear if it is a mono-wire boundary node)`),
        anchorFromB
      )
      const [nodeToB, anchorToB] = fullAnchorToIDAndAnchor(linkB.to)
      const translatedLinkBToA = boundaryAnchorsBA?.[linkB.to] || IDAnchorToFullAnchor(
        assertNotUndefined(
          nodeBijectionBA?.[nodeToB],
          `The node ${nodeToB} in the ${ruleFromName} diagram of the rule is not present in nodeBijectionBA nor in boundaryAnchorsBA (${linkB.to} should appear if it is a mono-wire boundary node)`),
        anchorToB
      )

      assertTrue(
        listsAreEqualUpToOrdering(
          [linkA.from, linkA.to],
          [translatedLinkBFromA, translatedLinkBToA]
        ),
        `The link '${linkIDA}', mapped, according to linkBijectionAB, to '${linkIDB}', does not map to the same translated nodes (${JSON.stringify([linkA.from, linkA.to].toSorted())} != ${JSON.stringify([translatedLinkBFromA, translatedLinkBToA].toSorted())})`
      )
    }, `Error when processing the mapping '${linkIDA}' --> '${linkIDB}' in linkBijectionAB`)
  })
  // === … Links in the linkBijectionCD exist in the rule diagram C
  keys(linkBijectionCD).forEach(linkID => assertNotUndefined(
    ruleTo?.linksWithID?.[linkID],
    `The link ${linkID} specified in the input of linkBijectionCD does not exist in the ${proofStep.direction === "lr" ? "RHS" : "LHS"}  diagram of the rule`)
  )
  // === Outputs of linkBijectionAB is one-to-one mapping to links in B (except multi-wire boundary links)…
  assertDontThrow(
    () => listsAreUniqueAndIdenticalSetsThrow(
      values(linkBijectionAB),
      keys(ruleFrom?.linksWithID).filter(linkID => nbMultiWireBoundaryLink(linkID, ruleFrom, theory) === 0)
    ),
    `Some links exist in the ${ruleFromName} diagram rule but do not exist in the output of linkBijectionAB, or the other way around. After comes the difference of the output of linkBijectionAB vs the non-boundary links that appear in the ${ruleFromName} diagram rule: `
  )
  // === … inputs of linkBijectionCD is one-to-one mapping to links in C (except multi-wire boundary links)…
  assertDontThrow(
    () => listsAreUniqueAndIdenticalSetsThrow(
      keys(linkBijectionCD),
      keys(ruleTo?.linksWithID).filter(linkID => nbMultiWireBoundaryLink(linkID, ruleTo, theory) === 0)
    ),
    `Some links exist in the ending rule but do not exist in the input of linkBijectionCD`
  )


  // === Boundary nodes should not appear in the bijection… TODO: check if it makes sense to allow them?
  assertTrue(
    keys(nodeBijectionAB).filter(nodeID => isBoundaryNodeID(nodeID, diagram)).length === 0,
    `Boundary nodes are not allowed in the input of nodeBijectionAB, we found the following problematic boundary nodes ${JSON.stringify(keys(nodeBijectionAB).filter(nodeID => isBoundaryNodeID(nodeID, diagram)))}`
  )
  // … (in either ends)
  assertTrue(
    keys(nodeBijectionBA).filter(nodeID => isBoundaryNodeID(nodeID, ruleFrom)).length === 0,
    `Boundary nodes are not allowed in the output of nodeBijectionAB, we found the following problematic boundary nodes ${JSON.stringify(keys(nodeBijectionBA).filter(nodeID => isBoundaryNodeID(nodeID, ruleFrom)))}`
  )
  // … also for nodeBijection CD
  assertTrue(
    keys(nodeBijectionCD).filter(nodeID => isBoundaryNodeID(nodeID, ruleTo)).length === 0,
    `Boundary nodes are not allowed in the input of nodeBijectionCD, we found the following problematic boundary nodes ${JSON.stringify(keys(nodeBijectionCD).filter(nodeID => isBoundaryNodeID(nodeID, ruleTo)))}`
  )

  // Check if links in ambiguityBoundaryLinksAB are not already in linkBijectionAB
  assertTrue(listsAreNotOverlapping(keys(linkBijectionAB), keys(proofStep.ambiguityBoundaryLinksAB)),
             `The links in ambiguityBoundaryLinksAB and in the input of linkBijectionAB should all be different`)

  // It will be handy later to map all multi-wire boundaries in the rule to their connected part in the diagram
  // (the mono-wire boundaries should already be specified in nodeBijectionAB)
  // From above (checkDiagram) we already know that there is at most one link per boundary
  const multiWireBoundaryNameToAnchorB : Record<BoundaryName, IDAnchor> = {
    // We allow multi-wire nodes connected to nothing, so we start by getting all multi-wires…
    ...Object.fromEntries(entries(ruleFrom?.nodes).map(([nodeID, node]) => {
      if (!isMultiWireBoundaryNode(node, theory)) {
        return undefined
      }
      return [
        assertNotUndefined(getBoundaryName(node, theory), `The multi-wire boundany node ${nodeID} has no specified boundary name.`),
        undefined
      ]
    }).filter(x => x !== undefined)),
    // … and now we add the connections (checkDiagram already checks that at most one connection is present)
    ...Object.fromEntries(entries(ruleFrom?.linksWithID).map(([linkID, link]) => {
      const n = nbMultiWireBoundaryLink(linkID, ruleFrom, theory)
      if (n === 0) { // not a multi-wire boundary link
        return undefined
      } else if (n === 1) { // from is multi-wire boundary link
        return [getBoundaryNameFromNode(link.from, ruleFrom, theory), link.from]
      } else if (n === 2) { // to is boundary link
        return [getBoundaryNameFromNode(link.to, ruleFrom, theory), link.to]
      } else {
        throw new ProofDiagError(`The link ${linkID} points to two multi-wire nodes which is not supported (no clear and useful semantic defined)`)
    }}).filter((x) => x !== undefined))
  }
  const multiWireBoundaryLinksB : IDAnchor[] = values(multiWireBoundaryNameToAnchorB)

  // monoBoundaryNameToIDAnchorInD(boundaryName, anchor) paps a boundary name to the name of the corresponding IDAnchor in D via:
  // boundaryName (obtained from C) = boundaryName (in B) --> nodeID (in B) --(boundaryAnchorsBA)--> nodeID (in A) = nodeID (in D)
  const _monoBoundaryNameToNodeIDinB : Record<BoundaryName, IDAnchor> = Object.fromEntries(entries(ruleFrom?.nodes).map(([nodeID, node]) => {
    if (isMonoWireBoundaryNode(node, theory)) {
      return [assertNotUndefined(getBoundaryName(node, theory), `Node ${nodeID} is supposed to be a mono-wire boundary node bus has no boundary name`), nodeID]
    }
    return undefined
  }).filter(x => x !== undefined))
  const monoBoundaryNameToIDAnchorInD = (boundaryName : BoundaryName, anchor: AnchorName) : IDAnchor => {
    const idAnchorInB = IDAnchorToFullAnchor(
      assertNotUndefined(
        _monoBoundaryNameToNodeIDinB?.[boundaryName],
        `No node found in the ${ruleFromName} diagram rule for boundary name ${boundaryName}`),
      anchor)
    return assertNotUndefined(boundaryAnchorsBA?.[idAnchorInB],
                              `The boundaryAnchorsBA contains no mapping for ${idAnchorInB}`)
  }


  // All links are either multi-wire boundary links, outside current rewriting region, or listed in the bijection
  // (here we want to prevent e.g. a wire between two nodes in the rewriting region where this ling is not listed in node/linkBijection)
  Object.entries((diagram?.linksWithID || {})).forEach(([linkID, link]) => {
    // If the link is already present in the rewriting rule, nothing to do:
    if (linkID in linkBijectionAB) {
      return
    }
    // == Check if the link is partially inside the rewriting region and throw an error if it is not a multi-wire boundary link
    // From node:
    const [fromNode, fromAnchor] = fullAnchorToIDAndAnchor(link.from)
    assertTrue(
      !nodesA.includes(fromNode) || multiWireBoundaryLinksB.includes(nodeBijectionAB[link.from]),
      `The link ${linkID} is not present in linkBijectionAB, yet its from node ${fromNode} is part of the region to be rewritten (i.e. is inside nodeBijectionAB) and is not a multi-wire anchor`
    )
    // To link:
    const [toNode, toAnchor] = fullAnchorToIDAndAnchor(link?.to)
    assertTrue(
      !nodesA.includes(toNode) || multiWireBoundaryLinksB.includes(nodeBijectionAB[link.to]),
      `The link ${linkID} is not present in linkBijectionAB, yet its to node ${toNode} is part of the region to be rewritten (i.e. is inside nodeBijectionAB) and is not a multi-wire anchor`
    )
  });

  // === After all these checks we can finally apply the changes!
  // == 1. Remove old stuff
  // As explained in the doc of ProofStepApplyRule, the semantic is to remove all links and nodes (except mono-wire boundaries):
  // We remove the old links
  keys(linkBijectionAB).forEach((linkID) => {
    assertNotUndefinedNR(
      diagram?.linksWithID?.[linkID],
      `Impossible to delete ${linkID} (from linkBijectionAB) since the link does not exist in the diagram.`
    )
    delete diagram.linksWithID[linkID]
  })
  // We remove the old nodes
  keys(nodeBijectionAB).forEach((nodeID) => {
    assertNotUndefinedNR(
      diagram?.nodes?.[nodeID],
      `Impossible to delete node ${nodeID}, the node does not exist`
    )
    delete diagram.nodes[nodeID]
  })
  // == 2. Add new stuff
  // We add back the nodes of the new diagram
  entries(ruleTo?.nodes).forEach(([nodeID, node]) => {
    // We don't add the boundary nodes, they either just help with the identification (multi-wire) or are already present (mono-wire)
    if (isBoundaryNodeID(nodeID, ruleTo)) {
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
    // TODO: think about how to set the position of the new node (center of all other nodes? relative to the first anchor?…)
  })

  // Deal with multi-wire boundary links by redirecting them
  const idAnchorToMultiWireBoundaryNameB = idAnchorToMultiWireBoundaryName(ruleFrom, theory)
  const multiWireBoundaryNameToIdAnchorC : Record<BoundaryName, IDAnchor> = multiWireBoundaryNameToIdAnchor(ruleTo, theory)
  entries(diagram?.linksWithID).forEach(([linkID, link]) => {
    // Link already in the transformation
    if (linkBijectionAB?.[linkID] !== undefined) {
      return
    }
    ([ // Code to deal with link.from is same as link.to, so we avoid code duplication we do this loop
       [link.from, "from"],
       [link.to, "to"]
      // as const is not a type coertion (it is not a "trust me") it just means "try to narrow down the type" so that
      // "from" is typed as "from" and not as string.
    ] as const).forEach(([pointedNodeAnchor, fromOrTo]) => {
      // I call it fromNode, but it may be toNode in the second iteration of the loop.
      const [ fromNode, fromAnchor ] = fullAnchorToIDAndAnchor(pointedNodeAnchor)
      // Check if fromNode.fromAnchor is a multi-wire boundary in the rule.
      const fromNodeB = nodeBijectionAB?.[fromNode]
      if (fromNodeB !== undefined) {
        const boundaryNames = idAnchorToMultiWireBoundaryNameB?.[IDAnchorToFullAnchor(fromNodeB, fromAnchor)]
        if (boundaryNames !== undefined && boundaryNames.length !== 0) {
          const boundaryName =
            (boundaryNames.length === 1)
            ? boundaryNames[0]
            : assertNotUndefined(
              (proofStep.ambiguityBoundaryLinksAB || {})?.[linkID][fromOrTo],
              `The link ${linkID} is coming from a node whose matching in the rule (${fromNodeB}) is attached to multiple multi-wire boundaryNames (${JSON.stringify(boundaryNames)}), hence we don't know which boundary to attribute to this link. Add it to ambiguityBoundaryLinksAB to fix the ambiguity.`
            );
          // We redirect the node
          const [nodeC, anchorC] = fullAnchorToIDAndAnchor(
            assertNotUndefined(
              multiWireBoundaryNameToIdAnchorC?.[boundaryName],
              `No multi-wire boundary with name ${boundaryName} exist in the destination rule. Your rule is not well-defined.`))
          const nodeD = assertNotUndefined(nodeBijectionCD?.[nodeC],
                                           `The node ${nodeC} in the ${ruleToName} of the rule does not appear in nodeBijectionC.`)
          link[fromOrTo] = IDAnchorToFullAnchor(nodeD, anchorC)
        }
      }
    })
  })

  // We add the links of the new rule
  entries(ruleTo?.linksWithID).forEach(([linkID, link]) => {
    const nLink = nbMultiWireBoundaryLink(linkID, ruleTo, theory)
    if (nLink > 0) {
      // Multi-wire boundary links. TODO: We will take care of them later (but still check)
      return
    }
    const [fromNode, fromAnchor] = fullAnchorToIDAndAnchor(link.from)
    const [toNode, toAnchor] = fullAnchorToIDAndAnchor(link.to)
    const newLinkID = assertNotUndefined(
      linkBijectionCD?.[linkID],
      `The link '${linkID}' does not exist in linkBijectionCD, how should we translate it to the new diagram?`
    )
    assertTrue(
      diagram?.linksWithID?.[newLinkID] === undefined,
      `Collision with the identifier ${newLinkID} in rule and original diagram. Rename the link in linkBijectiontCD to make sure it is unique.`
    )
    if (diagram?.linksWithID === undefined) {
      diagram.linksWithID = {}
    }
    diagram.linksWithID[newLinkID] = {
      ...link,
      from: isMonoWireBoundaryNodeID(fromNode, ruleTo, theory) ?
            // This is a mono-wire boundary node, we map it back to its original position
            monoBoundaryNameToIDAnchorInD(getBoundaryNameFromNode(fromNode, ruleTo, theory), fromAnchor)
          : // This is a regular node
            IDAnchorToFullAnchor(
              assertNotUndefined(
                proofStep?.nodeBijectionCD?.[fromNode],
                `The node ${fromNode} does not exist in the source of nodeBijectionCD`
              ),
              fromAnchor
            ),
      to: isMonoWireBoundaryNodeID(toNode, ruleTo, theory) ?
          // This is a mono-wire boundary node, we map it back to its original position
          monoBoundaryNameToIDAnchorInD(getBoundaryNameFromNode(toNode, ruleTo, theory), toAnchor)
        : // This is a regular node
          IDAnchorToFullAnchor(
            assertNotUndefined(
              proofStep?.nodeBijectionCD?.[toNode],
              `The node ${toNode} does not exist in the source of nodeBijectionCD`
            ),
            toAnchor
          )
    }
  })

  // TODO: check link direction/type/?
  assertDontThrow(() => checkDiagram(diagram, theory, false), `The final diagram is not well formed`)
  return diagram
}

/** Applies one step of a rewritting proof */
export function proofApplyOneStep(diagramOrig: Diagram, proofStep: ProofStep, theory: Theory, dontCopyDiagram : boolean = false) : Diagram {
  const kind = proofStep.kind;
  if (kind === "applyRule") {
    return proofApplyRule(diagramOrig, proofStep, theory, dontCopyDiagram)
  } if (kind === "move") {
    return proofApplyMove(diagramOrig, proofStep, dontCopyDiagram)
  } else {
    return diagramOrig
  }
}

export function matchSelectionToRule(
  nodeSelection: NodeID[],
  linkSelection: LinkID[],
  inputDiagram: Diagram,
  ruleDiagram: Diagram
) : {
  nodeBijectionAB: Record<NodeID, NodeID>,
  linkBijectionAB: Record<LinkID, LinkID>,
  boundaryLinksDR: BoundaryLinks,
  ambigiousBoundary: BoundaryName[],
} {

  return {
    nodeBijectionAB: {},
    linkBijectionAB: {},
    boundaryLinksDR: {},
    ambigiousBoundary: [],
  }
}
