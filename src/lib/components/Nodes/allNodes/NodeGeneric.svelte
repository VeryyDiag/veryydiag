<script lang="ts">
  import { getContextDiagram, getContextErrors, registerErrors } from "$lib/contexts/context.svelte";
  import type { Node } from "$lib/types/types";
  import { getTransformToElement, randomID, cmToUnit, unitToCm, toBoolean } from "$lib/utils";

  let diagramConfClass = getContextDiagram()

  let {
    id,
    nodeKind,
    svgString, // Populated by nodeKindToAvailableNode
    pos = $bindable(),
    svgGroupRef,
    params,
  } : Node & {id: string, svgGroupRef: SVGElement | undefined} = $props();

  let allErrorsComponent = $derived([...(svgString === undefined ? [ `No svgString for node ${id} of kind ${nodeKind}` ] : [])])

  let uid: string = randomID(); // We use it to register errors per component, this uid is the ID of the current component
  registerErrors(uid, () => allErrorsComponent)

  // Parameters can change the content of a node. For now node containing:
  // - data-proofdiag-param-content="someparam": their content will be replaced with the value of "someparam".
  // - data-proofdiag-param-hide="someparam": hide this element when someparam is true, show otherwise
  // - data-proofdiag-param-show="someparam": show this element when someparam is true, hide otherwise
  let paramSpecs = $derived(diagramConfClass.getParamSpecs(diagramConfClass.getCurrentTheoryName(), nodeKind))
  $effect(() => {
    if (svgGroupRef !== undefined && paramSpecs !== undefined) {
      Object.entries(paramSpecs).forEach(([paramName, paramSpec]) => {
        // Contents
        let toChange = svgGroupRef.querySelectorAll(`[data-proofdiag-param-content=${CSS.escape(paramName)}]`)
        toChange.forEach((elt) => {
          elt.innerHTML = `${params?.[paramName]?.value || paramSpec.default}`
        })
        // Hide
        toChange = svgGroupRef.querySelectorAll(`[data-proofdiag-param-show=${CSS.escape(paramName)}]`)
        toChange.forEach((elt) => {
          elt.setAttribute("visibility", toBoolean(
            (params?.[paramName]?.value !== undefined) ? params[paramName].value : paramSpec.default
          ) ? "visible" : "hidden")
        })
        // Show
        toChange = svgGroupRef.querySelectorAll(`[data-proofdiag-param-hide=${CSS.escape(paramName)}]`)
        toChange.forEach((elt) => {
          elt.setAttribute("visibility", !toBoolean(
            (params?.[paramName]?.value !== undefined) ? params[paramName].value : paramSpec.default
          ) ? "visible" : "hidden")
        })

      })
    }
  })
</script>
{@html svgString || ""}

<style>
  /* We don't want SVG text to show a different cursor and be selectable */
  :global([data-proofdiag-app] text) {
      cursor: default;
      user-select: none;
  }
</style>
