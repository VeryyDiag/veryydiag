// https://svelte.dev/docs/svelte/context
import { createContext, onDestroy } from 'svelte';
import type { AvailableNode, DiagramConf, DiagramConfByUser, IDAnchor, Point, Error, Viewport, AnchorName, NodeID, LinkID, Link, NodeKind } from "$lib/types/types";
import { officialSvgNameToSvgString } from '$lib/components/Nodes/allNodes';
import { cmToUnit, unitToCm, IDAnchorToFullAnchor, fullAnchorToIDAndAnchor, randomID } from '$lib/utils';
import { SvelteSet } from 'svelte/reactivity';

// Configuration

// https://svelte.dev/docs/svelte/$state
export class DiagramConfClass {
  /** Contains the configuration of the current diagram that will be saved to files */
  diagramConf : DiagramConf = $state({})

  /**
   * While it is possible to get coordinates of anchors via DOM access,
   * it is not super efficient and leads to a small lag when moving a node.
   * hence we maintain here the relative position of the anchor compared to its position.
   * This map maps `${nodeID}.${anchorName}` to this relative coordinate.
   */
  relativeAnchorPos : Record<string, Point> = $state({})

  /** Pointer to the main SVG element */
  svg: SVGGraphicsElement | undefined = $state(undefined)

  /** When drawing links, we add them here before they are completed. Unde */
  currentlyCreatedLink : undefined | { from: IDAnchor, to: Point } = $state(undefined)

  /** Selection */
  linkSelection = new SvelteSet<LinkID>()
  nodeSelection = new SvelteSet<NodeID>()
  
  constructor(conf: DiagramConfByUser = {}, svg: SVGGraphicsElement | undefined = undefined) {
    this.setConfig(conf)
    this.setSvg(svg)
  }

  // We should use => to preserve the this in order to be able to do onclick={todo.reset}
  getConfig = () => {
    return this.diagramConf
  }

  getAvailableNode = (nodeKind: NodeKind) => {
    return this.diagramConf?.availableNodes?.[nodeKind]
  }
  
  setSvg = (svg: SVGGraphicsElement | undefined) => {
    this.svg = svg;
  }

  setConfig = (conf: DiagramConfByUser) : Error | undefined => {
    if (conf?.viewport === undefined) {
      conf.viewport = {x: 0, y: 0, w: 20, h: 20}
    }
    // Check if IDs are unique
    const ids = (conf?.links || []).map(v => v?.id).filter((id) => id !== undefined)
    const duplicates = ids.filter((e, i, a) => a.indexOf(e) !== i)
    if (duplicates.length > 0) {
      return {message: `When importing the configuration we found multiple links with duplicated IDs: ${duplicates}`}
    }
      
    this.diagramConf = {...conf, links: Object.fromEntries((conf?.links || []).map((link) => [link?.id || `:${randomID()}`, link]))}
    return undefined
  }

  getViewport = () => this.diagramConf?.viewport || { x: 0, y: 0, w: 20, h: 20 }
  
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
    delete this.diagramConf?.links?.[linkID]
  }

  removeNode = (nodeID: NodeID) => {
    if (this.diagramConf?.links !== undefined) {
      Object.entries(this.diagramConf.links).forEach(([linkID, link]) => {
        if (fullAnchorToIDAndAnchor(link.from)[0] === nodeID || fullAnchorToIDAndAnchor(link.to)[0] === nodeID) {
          if (this.diagramConf?.links) {
            delete this.diagramConf.links[linkID]
          }
        }
      })
    }
    delete this.diagramConf?.diagramNodes?.[nodeID]
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
      const pos = this.diagramConf?.diagramNodes?.[nodeID].pos
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
    let res = this.diagramConf?.availableNodes?.[kind]
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
              throw new Error(`No svg found with name ${res.svgName} when considering the node kind "${kind}"`);
            } else {
              return res
            }
          }
        } else {
          const c = res?.componentName || "NodeGeneric"
          if (c == "NodeGeneric") {
            throw new Error(`The node with kind ${kind} has no svgName nor svgString`);
          } else {
            // Different component, they may accept arbitrary stuff
            return res
          }
        }
      }
    } else {
      throw new Error(`The configuration contains no availableNodes with kind ${kind}`);
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
        this.diagramConf.viewport = {x: unitToCm(bbox.x) - (newW-origW)/2, y: unitToCm(bbox.y)-(newH-origH)/2, w: newW, h: newH};
        if (scale !== undefined) {
          this.diagramConf.svgSize = {w: `${cmToUnit(newW) * scale}pt`, h: `${cmToUnit(newH) * scale}pt`}
        }
      }
    }

  addLink = (link: Link) : {message?: string} => {
    if (this.diagramConf?.links === undefined) {
      this.diagramConf.links = {}
    }
    if (link.id !== undefined) {
      if (this.diagramConf.links?.[link.id]) {
        return {message: `A link with ID ${link.id} already exists`}
      } else {
        this.diagramConf.links[link.id] = link
      }
    } else {
      this.diagramConf.links[`:${randomID()}`] = link
    }
    return {}
  }

  moveNode = (nodeID: NodeID, newPos: Point) : Error | undefined => {
    if (this.diagramConf?.diagramNodes?.[nodeID] === undefined) {
      return {message: `No node ${nodeID} to move`}
    }
    this.diagramConf.diagramNodes[nodeID].pos = newPos
  }

  getPositionNode = (nodeID: NodeID) : Point | Error => {
    if (this.diagramConf?.diagramNodes?.[nodeID] === undefined) {
      return {message: `No node ${nodeID} to get position from`}
    }
    return this.diagramConf.diagramNodes[nodeID].pos
  }


  addNode = (nodeKind: NodeKind, pos: Point, id: NodeID | undefined = undefined) => {
    if (id === undefined) {
      id = `:${randomID()}`
    }
    if (this.diagramConf.diagramNodes === undefined) {
      this.diagramConf.diagramNodes = {}
    }
    this.diagramConf.diagramNodes[id] = {nodeKind, pos}
  }
  
}

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
