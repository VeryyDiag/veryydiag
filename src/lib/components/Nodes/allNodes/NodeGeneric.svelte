<script lang="ts">
  import { getContextDiagram, getContextErrors, registerErrors } from "$lib/contexts/context.svelte";
  import type { Node } from "$lib/types/types";
  import { getTransformToElement, randomID, cmToUnit, unitToCm } from "$lib/utils";
  import { drag } from "$lib/components/svgEditor/navigateSVG.svelte"
  
  let diagramConfClass = getContextDiagram()
  
  let {
    id,
    nodeKind,
    svgString, // Populated by nodeKindToAvailableNode
    pos = $bindable(),
  } : Node & {id: string} = $props();
  
  let container : SVGGraphicsElement | undefined;

  let errorsAnchors : string[] = []
  
  $effect(() => {
    if (container === undefined) {
      return
    } else {
      const anchorsEltsSelectors = `[data-secudiag-anchor]`;
      const anchors = container.querySelectorAll<SVGGraphicsElement>(anchorsEltsSelectors);
      errorsAnchors = []
      const seenAnchors : Record<string, boolean> = {}
      anchors.forEach(anchorElt => {
        const anchor = anchorElt.dataset?.secudiagAnchor
        if (anchor == undefined) {
          errorsAnchors.push(`Weird, we should never get here (in ${id}), please report a bug.`);
          return
        }
        if (seenAnchors?.[anchor] !== undefined) {
          errorsAnchors.push(`The anchor ${anchor} is defined multiple times in node ${id}.`);
          return
        }
        seenAnchors[anchor] = true;
        const box = anchorElt.getBBox();
        if (container === undefined) {
          errorsAnchors.push(`Weird, the container in node ${id} suddently became undefined…`);
          return
        }
        const transform = getTransformToElement(anchorElt, container);
        const pt = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
        const ptTr = pt.matrixTransform(transform)
        diagramConfClass.setAnchor(id, anchor, {x: unitToCm(ptTr.x), y: unitToCm(ptTr.y)});
      })
    }
  })

  let allErrorsComponent = $derived([...(svgString === undefined ? [ `No svgString for node ${id} of kind ${nodeKind}` ] : []), ...errorsAnchors])
  
  let uid: string = randomID(); // We use it to register errors per component, this uid is the ID of the current component
  registerErrors(uid, () => allErrorsComponent)

</script>
<g bind:this={container} transform="translate({cmToUnit(pos?.x || 0)},{cmToUnit(pos?.y || 0)})" use:drag={({pos, diagramConfClass})} data-secudiag-node={id}>
  {@html svgString || ""}
</g>
