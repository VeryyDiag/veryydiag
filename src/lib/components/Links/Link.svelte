<script lang="ts">
  import {type Point } from "$lib/types/types"
  import { randomID, fullAnchorToIDAndAnchor } from "$lib/utils";
  import { getContextDiagram, registerErrors } from "$lib/contexts/context.svelte";

  let diagramConfClass = getContextDiagram()

  let {
    from,
    to
  } : {from: string, to: string | Point} = $props()

  let [ fromNode, fromAnchor = "out.0"] = $derived(fullAnchorToIDAndAnchor(from))

  let {x: fromX = undefined, y: fromY, message: errorsFrom} = $derived(({
    x : undefined,
    y : undefined,
    message : undefined,
    ...diagramConfClass.getXYOfAnchor(fromNode, fromAnchor)
  }));
  
  let {x: toX = undefined, y: toY, message: errorsTo} = $derived(({
    x : undefined,
    y : undefined,
    message : undefined,
    ... typeof to === 'string' ? diagramConfClass.getXYOfAnchor(...fullAnchorToIDAndAnchor(to, "in.0")) : to
  }));

  let uid: string = randomID(); // We use it to register errors per component, this uid is the ID of the current component
  registerErrors(uid, () => [...(errorsFrom ? [errorsFrom] : []), ...(errorsTo ? [errorsTo] : [])])
  
</script>
{#if fromX !== undefined && fromY !== undefined && toX !== undefined && toY !== undefined}
  <line x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="black" data-secudiag-kind="link" />
{/if}

