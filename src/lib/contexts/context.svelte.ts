// https://svelte.dev/docs/svelte/context
import { createContext, onDestroy } from 'svelte';
import type { AvailableNode, DiagramConf, Diagram, Theory, DiagramConfByUser, IDAnchor, Point, Error, Viewport, AnchorName, NodeID, LinkID, Link, NodeKind, NotificationKind, Notification, DiagramID, TheoryID, Rule, RuleName, Params, ParamSpecs, Param, ParamName, Tab, Proof, ProofID, ProofStep } from "$lib/types/types";
import { diagramConfToDiagramConfByUser, diagramConfByUserToDiagramConf, extractNodeParamSpecsFromSVG, ProofDiagError, availableNodeToParsedSVG } from "$lib/types/types";
import { officialSvgNameToSvgString } from '$lib/components/Nodes/allNodes';
import { cmToUnit, unitToCm, IDAnchorToFullAnchor, fullAnchorToIDAndAnchor, randomID, assertNever, assertTrue, isDeepEqual, log, assertNotUndefined, entries, assertNotUndefinedNR, keys } from '$lib/utils';
import { MapReduce } from '$lib/svelteRelatedUtils.svelte';
import { SvelteSet } from 'svelte/reactivity';
import { proofApplyOneStep, proofApplyRule } from '$lib/rules/rules';
import { proofStepApplyRuleFromSelection } from '$lib/rules/matching';

// Configuration

/** This (admitingly huge, not sure how to cleanly separate it) class is the main class that describe the whole file we are working on.
 *  Even if diagramConf is a $state (hence reactive), don't modify it yourself outside of this class as it allows us to track
 *  mutations easily, making features like undo/redo stack trivial to implement later.
 *  See also https://svelte.dev/docs/svelte/$state
 */
export class DiagramConfClass {
  /** Contains the configuration of the current diagram that will be saved to files */
  diagramConf = $state<DiagramConf>({
    diagrams: { main: {}},
    proofs: {},
    tabs: [{tabKind: "tabDiagram", diagramID: "main"}],
    currentTab: {tabKind: "tabDiagram", diagramID: "main"},
    theories: {}
  })

  /**
   * While it is possible to get coordinates of anchors via DOM access,
   * it is not super efficient and leads to a small lag when moving a node.
   * hence we maintain here the relative position of the anchor compared to its position.
   * This map maps `${nodeID}.${anchorName}` to this relative coordinate.
   */
  relativeAnchorPos = $state<Record<string, Point>>({})

  /** Pointer to the main SVG element */
  // Put the type inside $state!! https://github.com/sveltejs/svelte/issues/14435
  svg = $state<SVGGraphicsElement | undefined>(undefined)

  /** When drawing links, we add them here before they are completed. Unde */
  currentlyCreatedLink = $state<undefined | { from: IDAnchor, to: Point }>(undefined)

  /** Selection. We use lists and not sets because the order of selection may help to solve ambiguity in
   *  rule application.
   */
  linkSelection : LinkID[]= $state([])
  nodeSelection : NodeID[] = $state([])

  /** Notifications (information, temporary errors…) */
  notifications = $state<Notification[]>([])

  dontShowAgainWarningNotProofMode = false

  constructor(conf: DiagramConfByUser = {}, svg: SVGGraphicsElement | undefined = undefined) {
    if (keys(conf).length !== 0) {
      this.setConfig(conf)
    }
    this.setSvg(svg)
  }

  // We should use => to preserve the this in order to be able to do onclick={todo.reset}
  getConfig = () => {
    return this.diagramConf
  }

  getSVG = () => {
    return this.svg
  }

  getCurrentDiagramID = () : DiagramID => {
    const tab = this.diagramConf.currentTab
    assertTrue(tab?.tabKind === "tabDiagram",
               `The current tab is not a diagram `
    )
    return tab.diagramID
  }

  getCurrentProofID = () : ProofID => {
    const tab = this.diagramConf.currentTab
    assertTrue(tab?.tabKind === "tabProof",
               `The current tab is not a proof `
    )
    return tab.proofID
  }

  getCurrentProof = () : Proof => {
    return this.diagramConf.proofs[this.getCurrentProofID()]
  }

  getCurrentDiagramAndProofInfo = () : {diagram: Diagram, proofmode: false} | {diagram: Diagram, proofmode: true, currentStep: number, proofStep?: ProofStep, proof: Proof} => {
    const tab = this.diagramConf.currentTab
    const tabKind = tab.tabKind
    if (tabKind === "tabDiagram") {
      return {
        diagram: this.diagramConf.diagrams[this.getCurrentDiagramID()],
        proofmode: false
      }
    } else if (tabKind === "tabProof") {
      const proofID = this.getCurrentProofID()
      // We use a proxy so that doing diag.viewport = … changes the viewport property of proofStep
      // Not sure how efficient this will be since everytime we change the proofStep it recomputes all future elements, but let's try
      // (or if inneficient we can maybe save e.g. every second and cache it in the meantime?)
      const currentProof = assertNotUndefined(this.#currentProof, `Weird, currentProof is not defined but we are in a proof. Please report a bug`)
      const currentStep = currentProof?.currentStep || 0
      if (currentStep === 0) {
        // For the original diagram, we can directly modify it, no need to proxy
        return {
          diagram: this.derivedProofDiagrams.get(currentStep),
          proofmode: true,
          currentStep: currentStep,
          proof: currentProof,
        }
      } else {
        const diag = this.derivedProofDiagrams.get(currentStep)
        const proofStep = assertNotUndefined(currentProof?.steps[currentStep-1], `You try to access the step ${currentStep} of the proof, but this does not exist`)
        const proxy = new Proxy(diag, {
          get(obj, prop, receiver) {
            if (prop === "viewport") {
              const step = currentProof.steps[currentStep-1]
              if (step.kind === "group" || step.kind === "groupEnd") {
                // We can't move elements in group start/end
                return Reflect.get(obj, prop, receiver)
              }
              // We init the viewport to the current diagram viewport otherwise it jumps in the view
              // We would like to do:
              // if (diag?.viewport !== undefined) {
              //   step.viewport = diag?.viewport
              // }
              // return step.viewport
              // but we can't otherwise it cries that we change the viewport in a $derived, + it would always create a viewport
              // property while we may not want to do that. So instead, we do it in a more fancy way via a new proxy,
              // that, when changed, update the step!
              if (step?.viewport !== undefined) {
                return step.viewport
              } else {
                return new Proxy(diag?.viewport || { x: 0, y: 0, w: 20, h: 20 }, {
                  set(obj: Viewport, prop, value, receiver) {
                    Reflect.set(obj, prop, value, receiver)
                    step.viewport = obj
                    return true
                  }
                })
              }
            }
            return Reflect.get(obj, prop, receiver)
          },
          set(obj, prop, value, receiver) {
            if (prop === "viewport") {
              const step = currentProof.steps[currentStep-1]
              if (step.kind === "group" || step.kind === "groupEnd") {
                // We can't move elements in group start/end
                return false
              }
              step.viewport = value
              return true
            }
            else {
              return Reflect.set(obj, prop, value, receiver)
            }
          }
        })
        return {
          diagram: proxy,
          proofmode: true,
          currentStep: currentStep,
          proof: currentProof,
          proofStep: proofStep
        }
      }
    } else {
      assertNever(tabKind)
    }
  }

  getCurrentDiagram = () : Diagram => {
    return this.getCurrentDiagramAndProofInfo().diagram
  }

  getCurrentTab = () : Tab => {
      return this.diagramConf?.currentTab || { tabKind: "tabDiagram", diagramID: "main" }
  }

  getTabObject = (tab: Tab) : Diagram | Proof => {
    const tabKind = tab.tabKind
    if (tabKind === "tabDiagram") {
      return this.diagramConf.diagrams[tab.diagramID]
    } else if (tabKind === "tabProof") {
      return this.diagramConf.proofs[tab.proofID]
    } else {
      assertNever(tabKind)
    }
  }

  getCurrentTabObject = () : Diagram | Proof => {
    return this.getTabObject(this.getCurrentTab())
  }


  isInProofMode = () : boolean => {
    return this.getCurrentTab().tabKind === "tabProof"
  }

  getCurrentTheoryName = () : string => {
    return this.getCurrentDiagram()?.theory || "main"
  }

  getCurrentTheory = () : Theory => {
    return this.diagramConf.theories?.[this.getCurrentTheoryName()]
  }


  getAvailableNode = (nodeKind: NodeKind) => {
    return this.getCurrentTheory()?.availableNodes?.[nodeKind]
  }

  setSvg = (svg: SVGGraphicsElement | undefined) => {
    this.svg = svg;
  }

  setConfig = (conf: DiagramConfByUser) : Error | undefined => {
    console.log("Calling setConfig")
    try {
      this.diagramConf = diagramConfByUserToDiagramConf(conf)
      return undefined
    } catch (error) {
      return {message: `Error while setting the configuration: ${error}`}
    }
  }

  setConfigDontReparse = (conf: DiagramConf) : Error | undefined => {
    console.log("Calling setConfigDontReparse")
    console.trace("Calling setConfigDontReparse")
    try {
      this.diagramConf = conf
      return undefined
    } catch (error) {
      return {message: `Error while setting the configuration: ${error}`}
    }
  }

  getViewport = () => {
     return this.getCurrentDiagram()?.viewport || { x: 0, y: 0, w: 20, h: 20 }
  }

  getDiagramConfUser = () => {
    return diagramConfToDiagramConfByUser($state.snapshot(this.diagramConf))
  }

  setAnchor = (nodeID: NodeID, anchor: AnchorName, relativePosition: Point) => {
    this.relativeAnchorPos[`${nodeID}.${anchor}`] = relativePosition
  }

  isLinkSelected = (linkID: LinkID) => this.linkSelection.includes(linkID)

  toggleLinkSelection = (linkID: LinkID) => {
    if (this.linkSelection.includes(linkID)) {
      this.linkSelection = this.linkSelection.filter(x => x !== linkID)
    } else {
      this.linkSelection.push(linkID)
    }
  }

  removeLinkSelection = (linkID: LinkID) => {
    if (this.linkSelection.includes(linkID)) {
      this.linkSelection = this.linkSelection.filter(x => x !== linkID)
    }
  }

  addLinkSelection = (linkID: LinkID) => {
    if (!this.linkSelection.includes(linkID)) {
      this.linkSelection.push(linkID)
    }
  }


  toggleNodeSelection = (nodeID: NodeID) => {
    if (this.nodeSelection.includes(nodeID)) {
      this.nodeSelection = this.nodeSelection.filter(x => x !== nodeID)
    } else {
      this.nodeSelection.push(nodeID)
    }
  }

  removeNodeSelection = (nodeID: NodeID) => {
    if (this.nodeSelection.includes(nodeID)) {
      this.nodeSelection = this.nodeSelection.filter(x => x !== nodeID)
    }
  }

  addNodeSelection = (nodeID: NodeID) => {
    if (!this.nodeSelection.includes(nodeID)) {
      this.nodeSelection.push(nodeID)
    }
  }


  clearSelection = () => {
    this.linkSelection = []
    this.nodeSelection = []
  }

  removeLink = (linkID: LinkID) => {
    const info = this.getCurrentDiagramAndProofInfo()
    if (!info.proofmode || info?.proofStep === undefined) {
      const diag = info.diagram
      delete diag?.linksWithID?.[linkID]
      this.removeLinkSelection(linkID)
    } else {
      this.sendNotification("error", "Impossible to remove a link in proof mode (except for the initial diagram)")
    }
  }

  removeNode = (nodeID: NodeID) => {
    const info = this.getCurrentDiagramAndProofInfo()
    if (!info.proofmode || info?.proofStep === undefined) {
      const diag = info.diagram
      if (diag?.linksWithID !== undefined) {
        Object.entries(diag?.linksWithID || {}).forEach(([linkID, link]) => {
          if (fullAnchorToIDAndAnchor(link.from)[0] === nodeID || fullAnchorToIDAndAnchor(link.to)[0] === nodeID) {
            if (diag?.linksWithID) {
              delete diag.linksWithID[linkID]
            }
          }
        })
      }
      delete diag.nodes?.[nodeID]
      this.removeNodeSelection(nodeID)
    } else {
      this.sendNotification("error", "Impossible to remove a node in proof mode (except for the initial diagram)")
    }
  }

  removeSelection = () => {
    const info = this.getCurrentDiagramAndProofInfo()
    if (!info.proofmode || info?.proofStep === undefined) {
      this.linkSelection.forEach(this.removeLink)
      this.nodeSelection.forEach(this.removeNode)
      this.clearSelection()
    } else {
      this.sendNotification("error", "Impossible to remove the selection in proof mode (except for the initial diagram)")
    }
  }

  /** Triggers when pressing ctrl-A */
  selectAll = () => {
    const diag = this.getCurrentDiagram()
    this.nodeSelection = keys(diag?.nodes)
    this.linkSelection = keys(diag?.linksWithID)
  }

  isNodeSelected = (nodeID: NodeID) => this.nodeSelection.includes(nodeID)

  getXYOfAnchor = (nodeID: NodeID, anchor: AnchorName) : Point | Error => {
    const rel = this.relativeAnchorPos?.[IDAnchorToFullAnchor(nodeID, anchor)];
    if (rel !== undefined) {
      const pos = this.getCurrentDiagram()?.nodes?.[nodeID].pos
      if (pos !== undefined) {
        return {
          x: cmToUnit(pos.x + rel.x),
          y: cmToUnit(pos.y + rel.y)
        }
      } else {
        return {message: `Node ${nodeID} does not exist.`}
      }
    } else {
      return {message: `Can't find anchor ${nodeID}.${anchor}`}
    }
  }

  getXYOfFullAnchor = (fullAnchor: IDAnchor) : Point | Error => {
    return this.getXYOfAnchor(...fullAnchorToIDAndAnchor(fullAnchor))
  }


  // This turns a "kind" name into a component to mount
  nodeKindToAvailableNode = (kind: NodeKind) : AvailableNode => {
    let res = this.getCurrentTheory()?.availableNodes?.[kind]
    if (res !== undefined) {
      if (res.svgString !== undefined)
        return res
      else {
        if (res.svgName !== undefined) {
          const str = officialSvgNameToSvgString(res.svgName)
          if (str !== undefined)
            return {...res, svgString: str}
          else {
            const c = res?.componentName || "NodeGeneric"
            if (c == "NodeGeneric") {
              throw new ProofDiagError(`No svg found with name ${res.svgName} when considering the node kind "${kind}"`);
            } else {
              return res
            }
          }
        } else {
          const c = res?.componentName || "NodeGeneric"
          if (c == "NodeGeneric") {
            throw new ProofDiagError(`The node with kind ${kind} has no svgName nor svgString`);
          } else {
            // Different component, they may accept arbitrary stuff
            return res
          }
        }
      }
    } else {
      throw new ProofDiagError(`The configuration contains no availableNodes with kind ${kind}`);
    }
  }

  /** Changes the size of the viewport and (optionally) the svg itself. */
  fitViewportToContent = (
    {scale, minimumWidth, minimumHeight, paddingXPc, paddingYPc, breathe}
    : {
      /** Set scales to a value (e.g 1) if you also want to resize the width of the svg itself to scale * its actual width. */
      scale?: number,
      minimumWidth?: number,
      minimumHeight?: number,
      /** Padding on the X axis in percent (100 = the final figure is twice as big) */
      paddingXPc?: number,
      /** Padding on the Y axis in percent (100 = the final figure is twice as big) */
      paddingYPc?: number,
      /** Set to true to provide a set of meaningful settings, like padding{X/Y}Pc = 10, minimum{Width/Height}=10*/
      breathe?: boolean
    } = {}) => {
      const diag = this.getCurrentDiagram()
      if (this.svg !== undefined) {
        if (breathe) {
          paddingXPc = paddingXPc || 10
          paddingYPc = paddingYPc || 10
          minimumHeight = minimumHeight || 5
          minimumWidth = minimumWidth || 7
        }
        const bbox = this.svg.getBBox();
        // Set the viewport with these bounds
        const origW = unitToCm(bbox.width)
        const origH = unitToCm(bbox.height)
        const newW = Math.max(origW * (1 + (paddingXPc || 0)/100), minimumWidth || 0)
        const newH = Math.max(origH * (1 + (paddingYPc || 0)/100), minimumHeight || 0)
        diag.viewport = {x: unitToCm(bbox.x) - (newW-origW)/2, y: unitToCm(bbox.y)-(newH-origH)/2, w: newW, h: newH};
        if (scale !== undefined) {
          diag.svgSize = {w: `${cmToUnit(newW) * scale}pt`, h: `${cmToUnit(newH) * scale}pt`}
        }
      }
    }

  addLink = (link: Link) => {
    const info = this.getCurrentDiagramAndProofInfo()
    const diag = info.diagram
    if (!info.proofmode || info?.proofStep === undefined) {
      if (diag?.linksWithID === undefined) {
        diag.linksWithID = {}
      }
      if (link.id !== undefined) {
        if (diag.linksWithID?.[link.id]) {
          return {message: `A link with ID ${link.id} already exists`}
        } else {
          diag.linksWithID[link.id] = link
        }
      } else {
        diag.linksWithID[`:${randomID()}`] = link
      }
      return {}
    } else {
      this.sendNotification("error", "Impossible to add a link in proof mode (except for the initial diagram)")
    }
  }

  getLinks = () => {
    return this.getCurrentDiagram()?.linksWithID || {}
  }

  getNodes = () => {
    return this.getCurrentDiagram()?.nodes || {}
  }


  moveNode = (nodeID: NodeID, newPos: Point) : Error | undefined => {
    const info = this.getCurrentDiagramAndProofInfo()
    const diag = info.diagram
    if (!info.proofmode || info?.proofStep === undefined) {
      if (diag?.nodes?.[nodeID] === undefined) {
        return {message: `No node ${nodeID} to move`}
      }
      diag.nodes[nodeID].pos = newPos
    } else {
      const proofStep = info.proofStep
      if (proofStep.kind !== "group" && proofStep.kind !== "groupEnd") {
        if (proofStep?.move === undefined) {
          proofStep.move = {}
        }
        proofStep.move[nodeID] = newPos
      }
    }
  }

  getPositionNode = (nodeID: NodeID) : Point | Error => {
    const diag = this.getCurrentDiagram()
    if (diag?.nodes?.[nodeID] === undefined) {
      return {message: `No node ${nodeID} to get position from`}
    }
    return diag.nodes[nodeID].pos || {x: 0, y: 0}
  }


  addNode = (nodeKind: NodeKind, pos: Point, id: NodeID | undefined = undefined) => {
    const info = this.getCurrentDiagramAndProofInfo()
    const diag = info.diagram
    if (!info.proofmode || info?.proofStep === undefined) {
      if (id === undefined) {
        id = `:${randomID()}`
      }
      if (diag.nodes === undefined) {
        diag.nodes = {}
      }
      diag.nodes[id] = {nodeKind, pos}
    } else {
      this.sendNotification("error", "Impossible to add a node in proof mode (except for the initial diagram)")
    }
  }

  sendNotification = (kind: NotificationKind, message: string,
                      {
                        buttons = [],
                        codeFormatted = false,
                      } : {
                        buttons?: [string, () => void][],
                        codeFormatted?: boolean
                      } = {},
  ) => {
    this.notifications.push({kind, message, buttons, codeFormatted})
  }

  tryOrSendNotificationError(f: () => void) {
    try {
      f()
    } catch (e) {
      this.sendNotification("error", `${e}`)
    }
  }

  removeNotification = (notif: Notification) => {
    this.notifications = this.notifications.filter(x => x !== notif)
  }

  addDiagram = (diagID: DiagramID | undefined = undefined, diag : Diagram = {}, theory: TheoryID | undefined = undefined) => {
    const id : DiagramID = diagID || randomID()
    this.diagramConf.diagrams[id] = {
      ...({
        name: "Click to edit", // This can be overwritten by editing diag.name:
        nodes: {},
        linksWithID: {},
        theory: theory || this.getCurrentTheoryName(),
      }),
      ...diag
    }
    const tab : Tab = {
      tabKind: "tabDiagram",
      diagramID: id,
    }
    this.diagramConf.tabs.push(tab)
    this.diagramConf.currentTab = tab
  }

  changeTab = (tab: Tab) => {
    this.diagramConf.currentTab = tab
  }

  removeTab = (tab: Tab | undefined = undefined) => {
    const tabToDelete = tab || this.diagramConf.currentTab
    const tabKind = tabToDelete.tabKind
    this.diagramConf.tabs = this.diagramConf.tabs.filter(x => !isDeepEqual(x, tabToDelete))
    let theory = undefined // Needed to recreate a diagram if this is the last tab
    if (tabKind === "tabDiagram") {
      const id = tabToDelete.diagramID
      theory = this.diagramConf.diagrams[id].theory
      delete this.diagramConf.diagrams[id];
    } else if (tabKind === "tabProof") {
      const id = tabToDelete.proofID
      theory = this.diagramConf.proofs[id].startingDiagram.theory
      delete this.diagramConf.proofs[id];
    } else {
      assertNever(tabKind)
    }
    if (this.diagramConf.tabs.length === 0) {
      this.addDiagram("main", {name: "Main diagram"}, theory)
    }
    if (isDeepEqual(this.diagramConf.currentTab, tabToDelete)) {
      this.diagramConf.currentTab = this.diagramConf.tabs[0]
    }
  }


  addTheory = (theoryID: TheoryID | undefined = undefined, theory : Theory = {}) => {
    const id : TheoryID = theoryID || randomID()
    this.diagramConf.theories[id] = {
      ...(this.getCurrentTheory()),
      ...({
        theoryName: "Click to edit",
      }),
      ...theory
    }
    this.getCurrentDiagram().theory = id
  }

  changeTheory = (theoryID: TheoryID) => {
    this.getCurrentDiagram().theory = theoryID
  }

  removeTheory = (theoryID: TheoryID | undefined = undefined) => {
    const id = theoryID || this.getCurrentTheoryName()
    delete this.diagramConf.theories[id]
    if (Object.keys(this.diagramConf.theories).length === 0) {
      this.addTheory("main", {theoryName: "Main theory"})
    }
    if (this.getCurrentTheoryName() === id) {
      this.getCurrentDiagram().theory = Object.keys(this.diagramConf.theories)[0]
    }
  }

  addSVGNodeToTheory = (name: NodeID,
                        availableNode : AvailableNode,
                        nodeKind: NodeKind | undefined = undefined,
                        theoryID: TheoryID | undefined = undefined,
  ) => {
    const id = theoryID || this.getCurrentTheoryName()
    let newNodeKind = name || "nodekind (click to edit)"
    let nb = 0
    if (this.diagramConf.theories[id]?.availableNodes === undefined) {
      this.diagramConf.theories[id].availableNodes = {}
    }
    // Try to find an available node kind
    while (this.diagramConf?.theories[id]?.availableNodes?.[`${newNodeKind}${nb == 0 ? "" : nb}`] !== undefined) {
      nb++
    }
    availableNode.parsedSVG = availableNodeToParsedSVG(availableNode)
    this.diagramConf.theories[id].availableNodes[`${newNodeKind}${nb == 0 ? "" : nb}`] = availableNode
  }

  renameNodeKind = (oldNodeKind: NodeKind, newNodeKind: NodeKind, theoryID: TheoryID | undefined = undefined) => {
    const id = theoryID || this.getCurrentTheoryName()
    if (oldNodeKind === newNodeKind) {
      return true
    }
    if (this.diagramConf.theories[id]?.availableNodes === undefined) {
      this.diagramConf.theories[id].availableNodes = {}
    }
    if (this.diagramConf?.theories[id]?.availableNodes?.[newNodeKind] !== undefined) {
      this.sendNotification("error", `In theory ${this.diagramConf?.theories[id].theoryName} the node kind ${newNodeKind} already exists.`)
      return false
    }
    this.diagramConf.theories[id].availableNodes[newNodeKind] = this.diagramConf.theories[id].availableNodes[oldNodeKind]
    delete this.diagramConf.theories[id].availableNodes[oldNodeKind];
    // We also rename all references to this in all diagrams refering to this theory
    Object.entries(this.diagramConf?.diagrams || {}).forEach(([diagramID, diag]) => {
      Object.entries((diag?.nodes || {})).forEach(([nodeID, node]) => {
        if (node.nodeKind === oldNodeKind) {
          node.nodeKind = newNodeKind
        }
      })
    })
    return true
  }

  renameNodeID = (oldNodeID: NodeID, newNodeID: NodeID, diagramID: DiagramID | undefined = undefined) => {
    const diagID = diagramID || this.getCurrentDiagramID()
    if (oldNodeID === newNodeID) {
      return true
    }
    const diagram = assertNotUndefined(this.diagramConf?.diagrams?.[diagID],
                                       `The diagram id ${diagID} does not exist`)
    assertTrue(diagram?.nodes?.[newNodeID] === undefined,
               `A node with id ${newNodeID} already exists in the diagram`)
    // Helps typescript
    assertNotUndefinedNR(diagram.nodes, `The diagram contains no node`)
    const node = assertNotUndefined(diagram.nodes?.[oldNodeID],
                                    `The node ${oldNodeID} does not exist in the diagram`)
    diagram.nodes[newNodeID] = node
    delete diagram.nodes[oldNodeID]
    // We also rename the node in the links
    diagram.linksWithID = Object.fromEntries(entries(diagram.linksWithID).map(([linkID, link]) => {
      const [nodeFromID, nodeFromAnchor] = fullAnchorToIDAndAnchor(link.from)
      const [nodeToID, nodeToAnchor] = fullAnchorToIDAndAnchor(link.to)
      const newNodeFromID = nodeFromID === oldNodeID ? newNodeID : nodeFromID
      const newNodeToID = nodeToID === oldNodeID ? newNodeID : nodeToID
      return [linkID, {...link,
                       from: IDAnchorToFullAnchor(
                         newNodeFromID,
                         nodeFromAnchor
                       ),
                       to: IDAnchorToFullAnchor(
                         newNodeToID,
                         nodeToAnchor
                       ),
      }]
    }))
    // We also update the selection
    this.nodeSelection = this.nodeSelection.map(nodeID => nodeID === oldNodeID ? newNodeID : nodeID)
  }

  renameLinkID = (oldLinkID: LinkID, newLinkID: LinkID, diagramID: DiagramID | undefined = undefined) => {
    const diagID = diagramID || this.getCurrentDiagramID()
    if (oldLinkID === newLinkID) {
      return true
    }
    const diagram = assertNotUndefined(this.diagramConf?.diagrams?.[diagID],
                                       `The diagram id ${diagID} does not exist`)
    assertTrue(diagram?.linksWithID?.[newLinkID] === undefined,
               `A link with id ${newLinkID} already exists in the diagram`)
    // Helps typescript
    assertNotUndefinedNR(diagram.linksWithID, `The diagram contains no link`)
    const link = assertNotUndefined(diagram.linksWithID?.[oldLinkID],
                                    `The link ${oldLinkID} does not exist in the diagram`)
    diagram.linksWithID[newLinkID] = link
    delete diagram.linksWithID[oldLinkID]
    // We also update the selection
    this.linkSelection = this.linkSelection.map(linkID => linkID === oldLinkID ? newLinkID : linkID)
  }

  createRule = (ruleName: RuleName | undefined = undefined, rule: Rule = {}, theoryID: TheoryID | undefined = undefined,) => {
    const id = theoryID || this.getCurrentTheoryName()
    let newRuleName = ruleName || "My rule (click me to edit)"
    let nb = 0
    if (this.diagramConf.theories[id]?.rules === undefined) {
      this.diagramConf.theories[id].rules = {}
    }
    // Try to find an available rule name
    while (this.diagramConf?.theories[id]?.rules?.[`${newRuleName}${nb == 0 ? "" : nb}`] !== undefined) {
      nb++
    }
    this.diagramConf.theories[id].rules[`${newRuleName}${nb == 0 ? "" : nb}`] = rule
    return `${newRuleName}${nb == 0 ? "" : nb}`
  }

  renameRule = (oldRuleName: NodeKind, newRuleName: NodeKind, theoryID: TheoryID | undefined = undefined) => {
    const id = theoryID || this.getCurrentTheoryName()
    if (oldRuleName === newRuleName) {
      return true
    }
    if (this.diagramConf.theories[id]?.rules === undefined) {
      this.diagramConf.theories[id].rules = {}
    }
    if (this.diagramConf?.theories[id]?.rules?.[newRuleName] !== undefined) {
      this.sendNotification("error", `In theory ${this.diagramConf?.theories[id].theoryName} the rule ${newRuleName} already exists.`)
      return false
    }
    this.diagramConf.theories[id].rules[newRuleName] = this.diagramConf.theories[id].rules[oldRuleName]
    delete this.diagramConf.theories[id].rules[oldRuleName];
    // TODO: We need to also rename all references to this… once it is implemented!
    return true
  }

  setRuleLhs = (ruleName: RuleName, diagram : Diagram | undefined = undefined, theoryID: TheoryID | undefined = undefined) => {
    const id = theoryID || this.getCurrentTheoryName()
    const diag = diagram ? diagram : $state.snapshot(this.getCurrentDiagram())
    if (this.diagramConf?.theories[id]?.rules?.[ruleName] === undefined) {
      this.sendNotification("error", `Weird, the rule ${ruleName} does not exist. Report a bug.`)
      return
    }
    this.diagramConf.theories[id].rules[ruleName].lhs = diag
  }

  setRuleRhs = (ruleName: RuleName, diagram : Diagram | undefined = undefined, theoryID: TheoryID | undefined = undefined) => {
    const id = theoryID || this.getCurrentTheoryName()
    const diag = diagram ? diagram : $state.snapshot(this.getCurrentDiagram())
    if (this.diagramConf?.theories[id]?.rules?.[ruleName] === undefined) {
      this.sendNotification("error", `Weird, the rule ${ruleName} does not exist. Report a bug.`)
      return
    }
    this.diagramConf.theories[id].rules[ruleName].rhs = diag
  }

  deleteRule = (ruleName: RuleName, theoryID: TheoryID | undefined = undefined) => {
    const id = theoryID || this.getCurrentTheoryName()
    if (this.diagramConf?.theories[id]?.rules?.[ruleName] === undefined) {
      this.sendNotification("error", `The rule ${ruleName} does not exist. Report a bug.`)
      return
    }
    delete this.diagramConf.theories[id].rules[ruleName]
  }

  getLinkSelection = () => {
    return this.linkSelection
  }

  getNodeSelection = () => {
    return this.nodeSelection
  }

  getParamSpecs = (theoryID: TheoryID, nodeKind: NodeKind) : ParamSpecs | undefined => {
    return this.diagramConf?.theories?.[theoryID]?.availableNodes
    ?.[nodeKind]?.parsedSVG?.paramSpecs
  }

  changeNodeParam = (nodeID: NodeID, paramName: ParamName, newValue: string | boolean | number, diagID: DiagramID | undefined = undefined) => {
    const id = diagID || this.getCurrentDiagramID()
    const node = this.diagramConf?.diagrams?.[id]?.nodes?.[nodeID]
    if (node === undefined) {
      throw new ProofDiagError(`Node ${nodeID} does not exist in diagram ${id}`)
    }
    const currentTheory = this.diagramConf?.diagrams?.[id]?.theory || "main"
    if (this.getParamSpecs(currentTheory, node.nodeKind)?.[paramName] === undefined) {
      throw new ProofDiagError(`The parameter ${paramName} does not exist in node kind ${node.nodeKind} in theory ${currentTheory}`)
    }
    if (node?.params === undefined) {
      node.params = {}
    }
    node.params[paramName] = { value: newValue }
  }

  // ==== Proof-related stuff
  addProof = (diagram: Diagram | undefined = undefined) => {
    const startingDiagram = diagram || this.getCurrentDiagram()
    if (this.diagramConf?.proofs === undefined) {
      this.diagramConf.proofs = {}
    }
    const id = randomID()
    this.diagramConf.proofs[id] = {
      name: `Proof from ${startingDiagram?.name || "???"}`,
      startingDiagram: $state.snapshot(startingDiagram),
      description: "This proof shows that (click to edit me)…",
      steps: [],
    }
    const tab : Tab = {
      tabKind: "tabProof",
      proofID: id,
    }
    this.diagramConf.tabs.push(tab)
    this.diagramConf.currentTab = tab
  }

  currentProof = (proofID: ProofID | undefined = undefined) : Proof => {
    const actualProofID = proofID || this.getCurrentProofID()
    return this.diagramConf.proofs[actualProofID]
  }

  allProofSteps = (proofID: ProofID | undefined = undefined) : ProofStep[] => {
    return this.currentProof(proofID).steps
  }

  updateProofDescription = (description : string, proofID: ProofID | undefined = undefined) => {
    const proof = this.currentProof(proofID);
    proof.description = description;
  }

  updateProofStepDescription = (proofStepPosition: number, description : string, proofID: ProofID | undefined = undefined) => {
    const proof = this.currentProof(proofID);
    const step = proof.steps[proofStepPosition]
    assertTrue(step.kind !== "groupEnd", `You are trying to update the description of the ${proofStepPosition}-th step of the proof that is a groupEnd element and has therefore no description field`)
    step.description = description;
  }

  insertProofStep = (position : number, proofStep: ProofStep, proofID: ProofID | undefined = undefined) => {
    const proof = this.currentProof(proofID);
    if (proof?.steps === undefined) {
      proof.steps = []
    }
    proof.steps.splice(position, 0, proofStep)
    proof.currentStep = position + 1
  }

  insertMoveStep = (position : number, proofID: ProofID | undefined = undefined) => {
    this.insertProofStep(position, {kind: "move", move: {
      // "mysecondnode": {x: 45, y: 200+position*10}
    }}, proofID)
  }

  #currentProof : Proof | undefined = $derived.by(() => {
    if (this.isInProofMode()) {
      return this.getCurrentProof();
    } else {
      return undefined
    }
  })
  #currentProofSteps = $derived<ProofStep[]>(this.#currentProof?.steps || [])
  startingDiagram = $derived<Diagram>(this.#currentProof?.startingDiagram || {})
  derivedProofDiagrams = $derived(
    new MapReduce(this.#currentProofSteps,
                  (acc, x, i) => {
                    if (acc?.error !== undefined) {
                      return { error: `This rule cannot be computed since an error occured earlier in the proof history.`}
                    }
                    try {
                      const theory = assertNotUndefined(
                        this.diagramConf.theories?.[this.startingDiagram?.theory || "main"],
                        `The theory ${this.startingDiagram?.theory || "main"} does not exist`)
                      return proofApplyOneStep($state.snapshot(acc), x, theory)
                    } catch (e) {
                      return { error: `Error when applying the ${i+1}-th proof step (${e}).` }
                    }
                  },
                  this.startingDiagram)
  )

  setProofCurrentStep = (currentStep: number, proofID: ProofID | undefined = undefined) => {
    const _proofID = proofID || this.getCurrentProofID()
    let proof = assertNotUndefined(
      this.diagramConf?.proofs?.[_proofID],
      `Can't find proof ${_proofID}`
    )
    if (currentStep <= 0) {
      proof.currentStep = 0
    } else if (currentStep >= proof.steps.length) {
      // Don't put a - 1 here, 0 is first diagram, 1 is first step etc
      proof.currentStep = proof.steps.length
    } else {
      proof.currentStep = currentStep
    }
  }

  applyRule = (ruleName: string, direction: "rl" | "lr") => {
    let proofStep : ProofStep | undefined = undefined
    const diagAndProofInfo = this.getCurrentDiagramAndProofInfo()
    const diagram = diagAndProofInfo.diagram
    const theory = this.getCurrentTheory()
    console.log("theory", theory)
    try {
      proofStep = proofStepApplyRuleFromSelection(
        this.nodeSelection,
        this.linkSelection,
        diagram,
        ruleName,
        direction,
        theory
      )
    } catch (e) {
      this.sendNotification("error", `Error when matching the selection to the rule (${e})`,
                            {
                              buttons: [["Show details of failed matching", () => {
                                let str = "" // Accumulate the logs here
                                try {
                                  // The logs may be huge so we don't always compute them
                                  // unless asked by the user, that's why we recompute
                                  // the whole matching here
                                  proofStepApplyRuleFromSelection(
                                    this.nodeSelection,
                                    this.linkSelection,
                                    diagram,
                                    ruleName,
                                    direction,
                                    theory,
                                    (msg) => {str = `${str}\n${msg}`}
                                  )
                                } catch (e) {
                                  this.sendNotification("error", `Error when applying the rule (${e}).\nDetails:\n${str}`, {codeFormatted: true})
                                }
                              }]],
                              codeFormatted: true,
                            }
      )
    }
    if (proofStep === undefined) {
      return
    }
    if (!diagAndProofInfo.proofmode) {
      if (!this.dontShowAgainWarningNotProofMode) {
        this.sendNotification("warning", "You are NOT in proof mode, hence even if can apply a rule on a diagram, this is a destructive operation (the previous diagram is lost) and you won't have access to the rewritting sequence. If you want to start a proof, click instead on the 'start proof mode' icon in the top toolbar.",
                              {
                                buttons: [["Don't show again",
                                           () => this.dontShowAgainWarningNotProofMode = true]]
                              }
        )
      }
      try {
        this.diagramConf.diagrams[this.getCurrentDiagramID()] = proofApplyRule($state.snapshot(diagram), proofStep, theory)
      } catch (e) {
        this.sendNotification("error", `Error when applying the rule (${e})`,
                              {
                                buttons: [["Show details of proofStep", () => {
                                  this.sendNotification("error", `Error when applying the rule with the proofStep:\n${JSON.stringify(proofStep)}:\n\n${e}`, {codeFormatted: true})
                                }]],
                                codeFormatted: true,
                              })
      }
    } else {
      // We are in proof mode
      try {
        this.insertProofStep(diagAndProofInfo.currentStep, proofStep)
      } catch (e) {
        this.sendNotification("error", "${e}")
      }
    }
  }
}

// *** Jump to end, not sure how to cleanly avoid this huge class **

export const [getContextDiagram, setContextDiagram] = createContext<DiagramConfClass>();

// Errors

export type ErrorsMap = {[x:string]: string[]};
// We don't need () => ErrorsMap I think because this is a map hence this is already transmitted by-ref and not by value
export const [getContextErrors, setContextErrors] = createContext<ErrorsMap>();

export function registerErrors(uid: string, errors: () => string[]) {
  let allErrors = getContextErrors()
  $effect(() => {
    const err = errors();
    if (err.length > 0) {
      allErrors[uid] = err;
    } else {
      delete allErrors[uid];
    }
  })
  // A bit dirty since onDestroy is called each time the value change, but not sure how to do that otherwise…
  onDestroy(() => {
    delete allErrors[uid];
  });
}
