// https://svelte.dev/docs/svelte/context
import { createContext, onDestroy } from 'svelte';
import type { AvailableNode, DiagramConf } from "$lib/types/types";

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
  
  getAvailableNodeWithName = (name: string) : AvailableNode => {
    const res = (this.diagramConf?.availableNodes || []).filter(x => x.name == name)
    if (res.length == 1) {
      return res[0]
    } else if (res.length > 1) {
      throw new Error(`The configuration contains multiple availableNodes with name ${name}`);
    } else {
      throw new Error(`The configuration contains no availableNodes with name ${name}`);
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
