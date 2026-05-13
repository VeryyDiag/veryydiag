// https://svelte.dev/docs/svelte/context
import { createContext, onDestroy } from 'svelte';
import type { AvailableNode, DiagramConf, Diagram, Theory, DiagramConfByUser, IDAnchor, Point, Error, Viewport, AnchorName, NodeID, LinkID, Link, NodeKind, NotificationKind, Notification, DiagramID, TheoryID, Rule, RuleName, Params, ParamSpecs, Param, ParamName, Tab, Proof } from "$lib/types/types";
import { diagramConfToDiagramConfByUser, diagramConfByUserToDiagramConf, extractNodeParamSpecsFromSVG, ProofDiagError } from "$lib/types/types";
import { officialSvgNameToSvgString } from '$lib/components/Nodes/allNodes';
import { cmToUnit, unitToCm, IDAnchorToFullAnchor, fullAnchorToIDAndAnchor, randomID, assertNever, assertTrue, isDeepEqual } from '$lib/utils';
import { createReactiveMap2D } from '$lib/svelteRelatedUtils.svelte';
import { SvelteSet } from 'svelte/reactivity';

// Configuration

// https://svelte.dev/docs/svelte/$state
export class DiagramConfClass {
  /** Contains the configuration of the current diagram that will be saved to files */
  diagramConf = $state<DiagramConf>(diagramConfByUserToDiagramConf({}))
  /** Some informations are contained in the SVG file. To avoid duplicating it while allowing easier
   *  parsing, we derive them.
   */

  diagramConfDerivedParams = createReactiveMap2D<Record<TheoryID, Theory>, ParamSpecs>(
    () => this.diagramConf.theories,
    {
      getOuterKeys: x => Object.keys(x),
      getInnerKeys: (theories, k) => Object.keys(theories?.[k]?.availableNodes || {}),
      transform: (theories, k1, k2) => {
        const node = theories?.[k1]?.availableNodes?.[k2]
        if (node?.paramSpecs !== undefined) {
          return node.paramSpecs
        } else if (node?.svgString !== undefined) {
          return extractNodeParamSpecsFromSVG(node.svgString)
        } else if (node?.svgName !== undefined) {
          const str = officialSvgNameToSvgString(node.svgName)
          if (str !== undefined) {
            return extractNodeParamSpecsFromSVG(str)
          } else {
            throw new ProofDiagError(`The node ${node.svgName} has no matching SVG`)
          }
        }
        return {}
      },
    }
  )
  getDiagramConfDerivedParams = () => this.diagramConfDerivedParams
  
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

  /** Selection */
  linkSelection = new SvelteSet<LinkID>()
  nodeSelection = new SvelteSet<NodeID>()

  /** Notifications (information, temporary errors…) */
  notifications = $state<Notification[]>([])
  
  constructor(conf: DiagramConfByUser = {}, svg: SVGGraphicsElement | undefined = undefined) {
    this.setConfig(conf)
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
  
  getCurrentDiagram = () : Diagram => {
    return this.diagramConf.diagrams[this.getCurrentDiagramID()]
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
    return this.getTabObject(this.diagramConf?.currentTab || { tabKind: "tabDiagram", diagramID: "main" })
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
    try {
      this.diagramConf = diagramConfByUserToDiagramConf(conf)
      return undefined
    } catch (error) {
      return {message: `Error while setting the configuration: ${error}`}
    }
  }

  getViewport = () => this.getCurrentDiagram()?.viewport || { x: 0, y: 0, w: 20, h: 20 }

  getDiagramConfUser = () => {
    return diagramConfToDiagramConfByUser($state.snapshot(this.diagramConf))
  }
  
  setAnchor = (nodeID: NodeID, anchor: AnchorName, relativePosition: Point) => {
    this.relativeAnchorPos[`${nodeID}.${anchor}`] = relativePosition
  }

  isLinkSelected = (linkID: LinkID) => this.linkSelection.has(linkID)

  toogleLinkSelection = (linkID: LinkID) => {
    if (this.linkSelection.has(linkID)) {
      this.linkSelection.delete(linkID)
    } else {
      this.linkSelection.add(linkID)
    }
  }

  toogleNodeSelection = (nodeID: NodeID) => {
    if (this.nodeSelection.has(nodeID)) {
      this.nodeSelection.delete(nodeID)
    } else {
      this.nodeSelection.add(nodeID)
    }
  }

  clearSelection = () => {
    this.linkSelection.clear()
    this.nodeSelection.clear()
  }

  removeLink = (linkID: LinkID) => {
    delete this.getCurrentDiagram()?.linksWithID?.[linkID]
  }

  removeNode = (nodeID: NodeID) => {
    const diag = this.getCurrentDiagram()
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
  }
      
  removeSelection = () => {
    this.linkSelection.forEach(this.removeLink)
    this.nodeSelection.forEach(this.removeNode)
    this.clearSelection()
  }

  isNodeSelected = (nodeID: NodeID) => this.nodeSelection.has(nodeID)
  
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
    // console.log("res", $state.snapshot(res))
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

  addLink = (link: Link) : {message?: string} => {
    const diag = this.getCurrentDiagram()
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
  }

  getLinks = () => {
    return this.getCurrentDiagram()?.linksWithID || {}
  }

  getNodes = () => {
    return this.getCurrentDiagram()?.nodes || {}
  }

  
  moveNode = (nodeID: NodeID, newPos: Point) : Error | undefined => {
    const diag = this.getCurrentDiagram()
    if (diag?.nodes?.[nodeID] === undefined) {
      return {message: `No node ${nodeID} to move`}
    }
    diag.nodes[nodeID].pos = newPos
  }

  getPositionNode = (nodeID: NodeID) : Point | Error => {
    const diag = this.getCurrentDiagram()
    if (diag?.nodes?.[nodeID] === undefined) {
      return {message: `No node ${nodeID} to get position from`}
    }
    return diag.nodes[nodeID].pos || {x: 0, y: 0}
  }


  addNode = (nodeKind: NodeKind, pos: Point, id: NodeID | undefined = undefined) => {
    if (id === undefined) {
      id = `:${randomID()}`
    }
    const diag = this.getCurrentDiagram()
    if (diag.nodes === undefined) {
      diag.nodes = {}
    }
    diag.nodes[id] = {nodeKind, pos}
  }

  sendNotification = (kind: NotificationKind, message: string) => {
    this.notifications.push({kind, message})
  }

  removeNotification = (notif: Notification) => {
    this.notifications = this.notifications.filter(x => x !== notif)
  }

  addDiagram = (diagID: DiagramID | undefined = undefined, diag : Diagram = {}) => {
    const id : DiagramID = diagID || randomID()
    this.diagramConf.diagrams[id] = {
      ...({
        name: "Click to edit",
        nodes: {},
        linksWithID: {},
        theory: this.getCurrentTheoryName(),
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
    this.diagramConf.tabs = this.diagramConf.tabs.filter(x => isDeepEqual(x, tab))
    if (tabKind === "tabDiagram") {
      const id = tabToDelete.diagramID
      delete this.diagramConf.diagrams[id];
    } else if (tabKind === "tabProof") {
      const id = tabToDelete.proofID
      delete this.diagramConf.proofs[id];
    } else {
      assertNever(tabKind)
    }
    if (this.diagramConf.tabs.length === 0) {
      this.addDiagram("main", {name: "Main diagram"})
    }
    if (isDeepEqual(this.diagramConf.currentTab, tab)) {
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

  changeNodeParam = (nodeID: NodeID, paramName: ParamName, newValue: string | boolean | number, diagID: DiagramID | undefined = undefined) => {
    const id = diagID || this.getCurrentDiagramID()
    console.log("Changing to value", newValue)
    const node = this.diagramConf?.diagrams?.[id]?.nodes?.[nodeID]
    if (node === undefined) {
      throw new ProofDiagError(`Node ${nodeID} does not exist in diagram ${id}`)
    }
    const currentTheory = this.diagramConf?.diagrams?.[id]?.theory || "main"
    if (this.diagramConfDerivedParams?.[currentTheory]?.[node.nodeKind]?.[paramName] === undefined) {
      throw new ProofDiagError(`The parameter ${paramName} does not exist in node kind ${node.nodeKind} in theory ${currentTheory}`)
    }
    if (node?.params === undefined) {
      node.params = {}
    }
    node.params[paramName] = { value: newValue }
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
