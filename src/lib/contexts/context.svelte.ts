// https://svelte.dev/docs/svelte/context
import { createContext, onDestroy } from 'svelte';
import type { AvailableNode, DiagramConf, IDAnchor, Point, Error, Viewport, AnchorName, NodeID } from "$lib/types/types";
import { officialSvgNameToSvgString } from '$lib/components/Nodes/allNodes';
import { cmToUnit, unitToCm, IDAnchorToFullAnchor, fullAnchorToIDAndAnchor } from '$lib/utils';

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
  
  constructor(conf: DiagramConf = {}, svg: SVGGraphicsElement | undefined = undefined) {
    this.setConfig(conf)
    this.setSvg(svg)
  }

  // We should use => to preserve the this in order to be able to do onclick={todo.reset}
  getConfig = () => {
    return this.diagramConf
  }

  setSvg = (svg: SVGGraphicsElement | undefined) => {
    this.svg = svg;
  }

  setConfig = (conf: DiagramConf) => {
    if (conf?.viewport === undefined) {
      conf.viewport = {x: 0, y: 0, w: 20, h: 20}
    }
    this.diagramConf = conf
  }

  getViewport = () => this.diagramConf?.viewport || { x: 0, y: 0, w: 20, h: 20 }
  
  setAnchor = (nodeID: NodeID, anchor: AnchorName, relativePosition: Point) => {
    console.log("Setting anchor", nodeID, anchor, relativePosition)
    this.relativeAnchorPos[`${nodeID}.${anchor}`] = relativePosition
  }

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
  nodeKindToAvailableNode = (kind: string) : AvailableNode => {
    console.log("this.diagramConf?.availableNodes", $state.snapshot(this.diagramConf?.availableNodes))
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

  /** Changes the size of the viewport and (optionally) the svg itself */
  fitViewportToContent = (scale: number | undefined = undefined) => {
    if (this.svg !== undefined) {
      const bbox = this.svg.getBBox();
      // Set the viewport with these bounds
      this.diagramConf.viewport = {x: unitToCm(bbox.x), y: unitToCm(bbox.y), w: unitToCm(bbox.width), h: unitToCm(bbox.height)};
      if (scale !== undefined) {
        this.diagramConf.svgSize = {w: `${bbox.width * scale}pt`, h: `${bbox.height * scale}pt`}
      }
    }
  }

  addLink = ({from, to} : {from: IDAnchor, to: IDAnchor}) => {
    if (this.diagramConf?.links === undefined) {
      this.diagramConf.links = []
    }
    this.diagramConf.links.push({from, to})
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
