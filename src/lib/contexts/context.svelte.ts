// https://svelte.dev/docs/svelte/context
import { createContext, onDestroy } from 'svelte';
import type { AvailableNode, DiagramConf, NodeID, AnchorName, Point, Error } from "$lib/types/types";
import { officialSvgNameToSvgString } from '$lib/components/Nodes/allNodes';
import { cmToUnit, unitToCm } from '$lib/utils';

// Configuration

// https://svelte.dev/docs/svelte/$state
export class DiagramConfClass {
  diagramConf : DiagramConf = $state({})

  /**
   * While it is possible to get coordinates of anchors via DOM access,
   * it is not super efficient and leads to a small lag when moving a node.
   * hence we maintain here the relative position of the anchor compared to its position.
   * This map maps `${nodeID}.${anchorName}` to this relative coordinate.
   */
  relativeAnchorPos : Record<string, Point> = $state({})
  svg: SVGGraphicsElement | undefined = $state(undefined)
  
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

  setAnchor = (nodeID: NodeID, anchor: AnchorName, relativePosition: Point) => {
    console.log("Setting anchor", nodeID, anchor, relativePosition)
    this.relativeAnchorPos[`${nodeID}.${anchor}`] = relativePosition
  }
  
  getXYOfAnchor = (nodeID: NodeID, anchor: AnchorName) : Point | Error => {
    const rel = this.relativeAnchorPos?.[`${nodeID}.${anchor}`];
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
      // We try to manually compute it the first time we need to draw it
      // const selector = `[data-secudiag-node="${nodeID}"] [data-secudiag-anchor="${anchor}"]`;
      // const selectorParent = `[data-secudiag-node="${nodeID}"]`;
      // this.diagramConf?.diagramNodes?.[nodeID]?.pos.x; // force recompute when this changes, don't remove
      // this.diagramConf?.diagramNodes?.[nodeID]?.pos.y; // force recompute when this changes, don't remove
      // if (this.svg === undefined) {
      //   return {message: "No SVG was defined"}
      // }
      // const elts = this.svg?.querySelectorAll<SVGGraphicsElement>(selector);
      // if (elts === undefined) {
      //   return { message: `No svg found when searching for coordinates of ${nodeID}.${anchor} (via selector ${selector})`}
      // } else if (elts.length === 0) {
      //   return { message: `No element found when searching for ${nodeID}.${anchor} (via selector ${selector})`}
      // } else if (elts.length > 1) {
      //   return {message: `Too many (${elts.length}) elements found when searching for ${nodeID}.${anchor} (via selector ${selector})`}
      // } else {
      //   const eltsParent = this.svg?.querySelectorAll<SVGGraphicsElement>(selectorParent);
      //   if (eltsParent === undefined) {
      //     return { message: `No parent found when searching for coordinates of ${nodeID} (via selector ${selectorParent})`}
      //   } else if (eltsParent.length === 0) {
      //     return { message: `No element found when searching for ${nodeID} (via selector ${selectorParent})`}
      //   } else if (eltsParent.length > 1) {
      //     return {message: `Too many (${eltsParent.length}) elements found when searching for ${nodeID} (via selector ${selectorParent})`}
      //   } else {
      //     const elt = elts[0];
      //     const parent = eltsParent[0];
      //     const box = elt.getBBox();
      //     const boxParent = parent.getBBox();
      //     
      //     const transform = getTransformToElement(elt, this.svg);
      //     const transformParent = getTransformToElement(parent, this.svg);
      //     const pt = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
      //     const ptTr = pt.matrixTransform(transform)
      //     const ptParent = new DOMPoint(boxParent.x, boxParent.y);
      //     const ptParentTr = ptParent.matrixTransform(transformParent)
      //     this.relativeAnchorPos[`${nodeID}.${anchor}`] = {
      //       x: ptTr.x - ptParentTr.x,
      //       y: ptTr.y - ptParentTr.y,
      //     };
      //     return {x: ptTr.x, y: ptTr.y}
      //   }
      // }
    }
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
