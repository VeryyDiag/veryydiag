// https://svelte.dev/docs/svelte/context
import { createContext, onDestroy } from 'svelte';
import type { Writable } from 'svelte/store';
import type { AvailableNode, DiagramConf } from "$lib/types/types";

// Configuration

export const [getContextDiagram, setContextDiagram] = createContext<Writable<DiagramConf>>();

export function getAvailableNodeWithName(name: string, conf: DiagramConf) : AvailableNode {
  const res = (conf?.availableNodes || []).filter(x => x.name == name)
  if (res.length == 1) {
    return res[0]
  } else if (res.length > 1) {
    throw new Error(`The configuration contains multiple availableNodes with name ${name}`);
  } else {
    throw new Error(`The configuration contains no availableNodes with name ${name}`);
  }
}

// Errors

export type ErrorsMap = {[x:string]: string[]};
export const [getContextErrors, setContextErrors] = createContext<Writable<ErrorsMap>>();
// 
// Usage:
// let errors = $derived(Component !== undefined ? [] :
//                         [`Error: the component ${props.nodeKind} does not exist.`]);
// let uid: string = crypto.randomUUID(); // We use it to register errors per component, this uid is the ID of the current component
// $effect(() => registerErrors(uid, errors))
// 
export function registerErrors(uid: string, errors: string[]) {
  let errorsStore = getContextErrors()
  if (errors.length > 0) {
    errorsStore.update(e => {e[uid] = errors; return e})
  } else {
    errorsStore.update(e => {delete e[uid]; return e})
  }
  // A bit dirty since onDestroy is called each time the value change, but not sure how to do that otherwise…
  onDestroy(() => {
    errorsStore.update(e => {delete e[uid]; return e})
  });
}
