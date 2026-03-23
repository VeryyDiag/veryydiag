<script lang="ts">
  import type { DiagramConf } from "$lib/types/types"
  import Node from "$lib/components/Nodes/Node.svelte"  
  import { setContextDiagram, setContextErrors, type ErrorsMap, registerErrors, DiagramConfClass } from "$lib/contexts/context.svelte";
  import { panzoom } from "$lib/components/svgEditor/navigateSVG.svelte"
  import { cm } from "$lib/utils"

  /**
   * Interactive SVG editor component
   */

  interface SvgEditorProps {
    /** My diagramConf config */
    diagramConf: DiagramConf;
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
  $effect(() => {
    diagramConfClass.setConfig(diagramConf)
  })

  let svgRef : SVGGraphicsElement | undefined = undefined
  $effect(() => {
    diagramConfClass.setSvg(svgRef)
  })
  
  setContextDiagram(diagramConfClass)
  
  let allErrors : ErrorsMap = $state({})
  setContextErrors(allErrors)

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

<svg bind:this={svgRef} width={diagramConfClass.getConfig()?.svgSize?.w || "100%"} height={diagramConfClass.getConfig()?.svgSize?.h || "100%"} viewBox="{cm(diagramConfClass.getConfig()?.viewport?.x || 0)} {cm(diagramConfClass.getConfig()?.viewport?.y || 0)} {cm(diagramConfClass.getConfig()?.viewport?.w || 20)} {cm(diagramConfClass.getConfig()?.viewport?.h || 20)}" xmlns="http://www.w3.org/2000/svg" use:panzoom={diagramConfClass} style="touch-action: none;">
  {#each diagramConfClass.getConfig().diagramNodes || [] as node}
    <Node {...node}/>
  {/each}
</svg>

