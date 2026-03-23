<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getContextDiagram, getContextErrors, registerErrors } from "$lib/contexts/context.svelte";
  import type { Node } from "$lib/types/types";
  import { cmToUnit } from '$lib/utils';
  import { randomID } from "$lib/utils";
  import { drag } from "$lib/components/svgEditor/navigateSVG.svelte"
  
  let diagramConfClass = getContextDiagram()
  
  let {
    id,
    nodeKind,
    svgString, // Populated by nodeKindToAvailableNode
    pos = $bindable(),
  } : Node & {id: string} = $props();

  let allErrorsComponent = $derived(svgString === undefined ? [ `No svgString for node ${id} of kind ${nodeKind}` ] : [])
  
  let uid: string = randomID(); // We use it to register errors per component, this uid is the ID of the current component
  registerErrors(uid, () => allErrorsComponent)
  
  let container;
  
  /* import type { NodeCustom } from "$lib/types/types";
   * import { onMount } from "svelte";
   * import { getTransformToElement } from "$lib/utils";
   * import svgString from "./Nodes/NodeDiscard.svg?raw";
   * let props : NodeCustom = $props();
   * let container;
   * let line = { x1: 0, y1: 0, x2: 0, y2: 0 };

   * 
   * function updateLine(eltA, eltB) {
   *   const a = eltA.getBBox();
   *   const b = eltB.getBBox();
   *   // https://stackoverflow.com/questions/35373882/get-the-global-transform-matrix-of-an-svg-element
   *   const transformA = getTransformToElement(eltA, container);
   *   const transformB = getTransformToElement(eltB, container);
   *   let ptA = new DOMPoint(a.x + a.width / 2, a.y + a.height / 2);
   *   let ptB = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2);
   *   ptA = ptA.matrixTransform(transformA);
   *   ptB = ptB.matrixTransform(transformB);
   *   line = {
   *     x1: ptA.x,
   *     y1: ptA.y,
   *     x2: ptB.x,
   *     y2: ptB.y
   *   };
   * }

   * onMount(() => {
   *   // Mount the svg
   *   let svgElt = container?.querySelector("svg");
   *   console.log(svgElt)
   *   svgElt.setAttribute('x', 100);
   *   updateLine(document.getElementById("A"), svgElt.querySelector('[data-secudiag-input="0"]'));
   *   svgElt.querySelector('[data-secudiag-input="0"]').addEventListener('click', function(){alert("clicked!")})
   * }); */
</script>
<g bind:this={container} transform="translate({cmToUnit(pos?.x || 0)},{cmToUnit(pos?.y || 0)})" use:drag={({pos, diagramConfClass})} data-secudiag-node={id}>
  {@html svgString || ""}
</g>
