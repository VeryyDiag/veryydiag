// https://svelte.dev/docs/svelte/context
import { createContext, onDestroy } from 'svelte';
import type { AvailableNode, DiagramConf } from "$lib/types/types";
import { officialSvgNameToSvgString } from '$lib/components/Nodes/allNodes';

// Configuration

// https://svelte.dev/docs/svelte/$state
export class DiagramConfClass {
  diagramConf : DiagramConf = $state({})

  constructor(conf: DiagramConf = {}) {
    this.diagramConf = conf
  }

  // We should use => to preserve the this in order to be able to do onclick={todo.reset}
  getConfig = () => {
    return this.diagramConf
  }

  setConfig = (conf: DiagramConf) => {
    this.diagramConf = conf
  }

  // This turns a "kind" name into a component to mount
  nodeKindToAvailableNode = (kind: string) : AvailableNode => {
    console.log("this.diagramConf?.availableNodes", $state.snapshot(this.diagramConf?.availableNodes))
    let res = (this.diagramConf?.availableNodes || []).filter(x => x.nodeKind == kind)
    console.log("res", $state.snapshot(res))
    if (res.length === 1) {
      if (res[0].svgString !== undefined)
        return res[0]
      else {
        if (res[0].svgName !== undefined) {
          const str = officialSvgNameToSvgString(res[0].svgName)
          if (str !== undefined)
            return {...res[0], svgString: str}
          else {
            const c = res[0]?.componentName || "NodeGeneric"
            if (c == "NodeGeneric") {
              throw new Error(`No svg found with name ${res[0].svgName} when considering the node kind "${kind}"`);
            } else {
              return res[0]
            }
          }
        } else {
          const c = res[0]?.componentName || "NodeGeneric"
          if (c == "NodeGeneric") {
            throw new Error(`The node with kind ${kind} has no svgName nor svgString`);
          } else {
            // Different component, they may accept arbitrary stuff
            return res[0]
          }
        }
      }
    } else if (res.length > 1) {
      throw new Error(`The configuration contains multiple availableNodes with kind ${kind}`);
    } else {
      throw new Error(`The configuration contains no availableNodes with kind ${kind}`);
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
