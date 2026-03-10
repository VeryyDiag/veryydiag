<script lang="ts">
  // This component is a wrapper that takes care of checking, given nodeKind, which component must be loaded, with which properties etc
  import type { AvailableNode, Node } from "$lib/types/types"
  import { componentNameToComponent } from "$lib/components/Nodes/allNodes"
  import { registerErrors } from "$lib/contexts/context.svelte";
  import { randomID } from "$lib/utils";
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  
  // This file is used to draw arbitrary nodes
  let props : Node = $props();

  let diagramConfClass = getContextDiagram()
  // See which component we should mount etc
  let [availableNode, errorsA] : [AvailableNode | null, string[]] = $derived.by(() => {
    try {
      return [diagramConfClass.nodeKindToAvailableNode(props.nodeKind), []]
    } catch (err) {
      let errMsg = ""
      if (err instanceof Error) {
        errMsg = err.message
      } else {
        errMsg = String(err)
      }
      return [null, [errMsg]]
    }
  })
  

  const Component = $derived(componentNameToComponent(availableNode?.componentName || "NodeGeneric"));

  let errorsB = $derived(Component !== undefined ? [] :
                        [`Error: the component ${props.nodeKind} does not exist.`]);
  let uid: string = randomID(); // We use it to register errors per component, this uid is the ID of the current component
  let errors = $derived([...errorsA, ...errorsB])
  registerErrors(uid, () => errors)
</script>
{#if Component !== undefined}
  <Component {...({...props, ...availableNode})}/>
{/if}
