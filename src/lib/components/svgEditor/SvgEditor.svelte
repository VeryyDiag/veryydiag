<script lang="ts">
  import type { DiagramConfByUser, Error } from "$lib/types/types"
  import Node from "$lib/components/Nodes/Node.svelte"  
  import Link from "$lib/components/Links/Link.svelte"  
  import { setContextDiagram, setContextErrors, type ErrorsMap, registerErrors, DiagramConfClass } from "$lib/contexts/context.svelte";
  import { panzoom, drawLink, selectElement, drag } from "$lib/components/svgEditor/navigateSVG.svelte"
  import { cm, randomID } from "$lib/utils"

  /**
   * Interactive SVG editor component
   */

  interface SvgEditorProps {
    /** My diagramConf config */
    diagramConf: DiagramConfByUser;
    /** Enable some extra information when debugging */
    debug?: boolean;
    /**
       Only prints like a fixed image SVG (can't pan, modify etc) when number is defined.
       The number represents the zoom (set to 1 to print 1 by default).
     */
    onlySvg?: number;
    /** */
  }
  let {
    diagramConf = {},
    debug = false,
    onlySvg = undefined,
  } : SvgEditorProps = $props();

  let diagramConfClass : DiagramConfClass = new DiagramConfClass();
  setContextDiagram(diagramConfClass)
  
  let allErrors : ErrorsMap = $state({})
  setContextErrors(allErrors)

  let errorsImport : Error | undefined = $state(undefined)
  $effect(() => {
    errorsImport = diagramConfClass.setConfig(diagramConf)
  })
  let uid: string = randomID(); // We use it to register errors per component, this uid is the ID of the current component
  let errors = $derived(errorsImport ? [errorsImport] : [])
  registerErrors(uid, () => errors)

  let svgRef : SVGGraphicsElement | undefined = undefined
  $effect(() => {
    diagramConfClass.setSvg(svgRef)
  })
  
  $effect(() => {
    if (onlySvg !== undefined) {
      diagramConfClass.fitViewportToContent(onlySvg)
    }
  })
  
</script>
<!--
     Horizontal rule component foo bar. This description doesn't appear in 'Docs'! 
     @component
-->

{#each Object.entries(allErrors) as [uid, errors]}
  {#each errors as error}
    <p style="color: red;">
      Error: {error}
    </p>
  {/each}
{/each}

{#if onlySvg === undefined}
  <button onclick={() => diagramConfClass.fitViewportToContent(1)}>Fit viewport to content</button>
{/if}

{#if debug}
  <div>
    viewBox="{cm(diagramConfClass.getConfig()?.viewport?.x || 0)} {cm(diagramConfClass.getConfig()?.viewport?.y || 0)} {cm(diagramConfClass.getConfig()?.viewport?.w || 20)} {cm(diagramConfClass.getConfig()?.viewport?.h || 20)}"
  </div>
{/if}

<svg bind:this={svgRef} width={diagramConfClass.getConfig()?.svgSize?.w || "100%"} height={diagramConfClass.getConfig()?.svgSize?.h || "100%"} viewBox="{cm(diagramConfClass.getViewport().x)} {cm(diagramConfClass.getViewport().y)} {cm(diagramConfClass.getViewport().w)} {cm(diagramConfClass.getViewport().h)}" xmlns="http://www.w3.org/2000/svg" use:panzoom={diagramConfClass} use:drawLink={diagramConfClass} use:selectElement={diagramConfClass} use:drag={diagramConfClass} style="touch-action: none;">
  <!-- If the bounding box of the element is too small (e.g. horizontal line will have zero height), add invisible elements around it to increase the size of the bounding box -->
  <filter id="selected" x="-450%" y="-450%" width="1000%" height="1000%">
    <feGaussianBlur stdDeviation="4" result="blur"/>
    <feFlood flood-color="dodgerblue" flood-opacity="1" result="color"/>
    <feComposite in="color" in2="blur" operator="in" result="glow"/>
    <feMerge>
      <feMergeNode in="glow"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
  {#each Object.entries(diagramConfClass.getConfig()?.links || {}) as [linkID, link]}
    <Link {...link} id={linkID}  />
  {/each}
  {#if diagramConfClass?.currentlyCreatedLink !== undefined}
    <Link from={diagramConfClass.currentlyCreatedLink.from} to={diagramConfClass.currentlyCreatedLink.to} />
  {/if}
  {#each Object.entries(diagramConfClass.getConfig().diagramNodes || {}) as [id, node]}
    <Node id={id} {...node} />
  {/each}
</svg>

