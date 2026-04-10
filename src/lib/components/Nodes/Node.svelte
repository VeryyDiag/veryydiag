<script lang="ts">
  // This component is a wrapper that takes care of checking, given nodeKind, which component must be loaded, with which properties etc
  import type { AvailableNode, Node } from "$lib/types/types"
  import { componentNameToComponent } from "$lib/components/Nodes/allNodes"
  import { registerErrors } from "$lib/contexts/context.svelte";
  import { getTransformToElement, randomID, cmToUnit, unitToCm } from "$lib/utils";
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  
  // This file is used to draw arbitrary nodes
  let props : Node & {id: string} = $props();

  let diagramConfClass = getContextDiagram()

  let selected = $derived(props.id !== undefined ? diagramConfClass.isNodeSelected(props.id) : false)
  
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


  // Deals with positioning and finding anchors
  
  let container = $state<SVGGraphicsElement | undefined>(undefined);

  let errorsAnchors : string[] = []

  // This computes basically once when creating the node the position of the anchors relative to the node.
  // This helps when drawing links
  $effect(() => {
    if (container === undefined) {
      return
    } else {
      const anchorsEltsSelectors = `[data-proofdiag-anchor]`;
      const anchors = container.querySelectorAll<SVGGraphicsElement>(anchorsEltsSelectors);
      errorsAnchors = []
      const seenAnchors : Record<string, boolean> = {}
      anchors.forEach(anchorElt => {
        const anchor = anchorElt.dataset?.proofdiagAnchor
        if (anchor == undefined) {
          errorsAnchors.push(`Weird, we should never get here (in ${props.id}), please report a bug.`);
          return
        }
        if (seenAnchors?.[anchor] !== undefined) {
          errorsAnchors.push(`The anchor ${anchor} is defined multiple times in node ${props.id}.`);
          return
        }
        seenAnchors[anchor] = true;
        const box = anchorElt.getBBox();
        if (container === undefined) {
          errorsAnchors.push(`Weird, the container in node ${props.id} suddently became undefined…`);
          return
        }
        const transform = getTransformToElement(anchorElt, container);
        const pt = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
        const ptTr = pt.matrixTransform(transform)
        diagramConfClass.setAnchor(props.id, anchor, {x: unitToCm(ptTr.x), y: unitToCm(ptTr.y)});
      })
    }
  })


  
  let errorsB = $derived(Component !== undefined ? [] :
                         [`Error: the component ${props.nodeKind} does not exist.`]);
  let uid: string = randomID(); // We use it to register errors per component, this uid is the ID of the current component
  let errors = $derived([...errorsA, ...errorsB, ...errorsAnchors])
  registerErrors(uid, () => errors)
</script>
{#if Component !== undefined}
  <g bind:this={container} transform="translate({cmToUnit(props.pos?.x || 0)},{cmToUnit(props.pos?.y || 0)})" data-proofdiag-node={props.id} filter={selected ? "url(#selected)" : ""}>
    <Component {...({...props, ...availableNode})}/>
  </g>
{/if}
