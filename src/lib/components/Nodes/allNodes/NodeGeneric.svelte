<script lang="ts">
  import { getContextDiagram, getContextErrors, registerErrors } from "$lib/contexts/context.svelte";
  import type { Node } from "$lib/types/types";
  import { getTransformToElement, randomID, cmToUnit, unitToCm } from "$lib/utils";
  
  let diagramConfClass = getContextDiagram()
  
  let {
    id,
    nodeKind,
    svgString, // Populated by nodeKindToAvailableNode
    pos = $bindable(),
  } : Node & {id: string} = $props();

  let allErrorsComponent = $derived([...(svgString === undefined ? [ `No svgString for node ${id} of kind ${nodeKind}` ] : [])])
  
  let uid: string = randomID(); // We use it to register errors per component, this uid is the ID of the current component
  registerErrors(uid, () => allErrorsComponent)

</script>
{@html svgString || ""}
