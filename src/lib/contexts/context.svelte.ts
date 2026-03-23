// https://svelte.dev/docs/svelte/context
import { createContext, onDestroy } from 'svelte';
import type { AvailableNode, DiagramConf } from "$lib/types/types";
import { officialSvgNameToSvgString } from '$lib/components/Nodes/allNodes';
import { unitToCm, getTransformToElement } from '$lib/utils';

// Configuration

// https://svelte.dev/docs/svelte/$state
export class DiagramConfClass {
  diagramConf : DiagramConf = $state({})
  
  relativeAnchorPos : DiagramConf = $state({})
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

  getXYOfAnchor = (nodeID: string, anchor: string) : [number, number] | string => {
    const selector = `[data-secudiag-node="${nodeID}"] [data-secudiag-anchor="${anchor}"]`;
    this.diagramConf?.diagramNodes?.[nodeID]?.pos.x; // force recompute when this changes, don't remove
    this.diagramConf?.diagramNodes?.[nodeID]?.pos.y; // force recompute when this changes, don't remove
    const elts = this.svg?.querySelectorAll<SVGGraphicsElement>(selector);
    if (elts === undefined) {
      return `No svg found when searching for coordinates of ${nodeID}.${anchor} (via selector ${selector})`
    } else if (elts.length === 0) {
      return `No element found when searching for ${nodeID}.${anchor} (via selector ${selector})`
    } else if (elts.length > 1) {
      return `Too many (${elts.length}) elements found when searching for ${nodeID}.${anchor} (via selector ${selector})`
    } else {
      const elt = elts[0];
      const box = elt.getBBox();
      if (this.svg === undefined) {
        return "No SVG was defined"
      } else {
        const transform = getTransformToElement(elt, this.svg);
        const pt = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
        const ptTr = pt.matrixTransform(transform)
        return [ptTr.x, ptTr.y];
      }
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
