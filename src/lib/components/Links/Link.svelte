<script lang="ts">
  import type { Point, Link } from "$lib/types/types"
  import { randomID, fullAnchorToIDAndAnchor, cm, exceptionToErrorMessage } from "$lib/utils";
  import { getContextDiagram, registerErrors } from "$lib/contexts/context.svelte";

  let diagramConfClass = getContextDiagram()

  let {
    from,
    to,
    id,
  } : Omit<Link, "to"> & { to: Link["to"] | Point; } = $props() // We also allow to to contain directly a point, needed when drawing lines

  let [ fromNode, fromAnchor = "out.0"] = $derived(fullAnchorToIDAndAnchor(from))

  let selected = $derived(id !== undefined ? diagramConfClass.isLinkSelected(id) : false)

  let {x: fromX = undefined, y: fromY, message: errorsFrom} = $derived(({
    x : undefined,
    y : undefined,
    message : undefined,
    ...exceptionToErrorMessage(() => diagramConfClass.getXYOfAnchor(fromNode, fromAnchor))
  }));

  let {x: toX = undefined, y: toY, message: errorsTo} = $derived(({
    x : undefined,
    y : undefined,
    message : undefined,
    ... typeof to === 'string'
            ? exceptionToErrorMessage(() =>
              diagramConfClass.getXYOfAnchor(...fullAnchorToIDAndAnchor(to, "in.0")))
            : to
  }));

    let uid: string = randomID(); // We use it to register errors per component, this uid is the ID of the current component
    registerErrors(uid, () => [...(errorsFrom ? [errorsFrom] : []), ...(errorsTo ? [errorsTo] : [])])

</script>
{#if fromX !== undefined && fromY !== undefined && toX !== undefined && toY !== undefined}
  <g filter={selected ? "url(#selected)" : ""}>
    {#if from !== to}
      <!-- Circle are only used to have correct bounding box for filter effects to work -->
      <circle cx={fromX} cy={fromY} r={cm(0.05/2)} visibility="hidden" />
      <circle cx={toX} cy={toY} r={cm(0.05/2)} visibility="hidden" />
      <line x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="black" data-veryydiag-link={id} stroke-width={cm(0.05)} stroke-linecap="round" />
    {:else}
      <!-- Self-loop -->
      <circle cx={fromX} cy={fromY} r={cm(0.05/2)} visibility="hidden" />
      <circle cx={toX} cy={toY} r={cm(0.05/2)} visibility="hidden" />
      <path d="M {fromX} {fromY} c {cm(1)} {cm(1)}, {cm(1)} {cm(-1)}, 0 0 " stroke="black" fill="transparent" data-veryydiag-link={id} stroke-width={cm(0.05)} stroke-linecap="round" />
    {/if}
  </g>
{/if}
