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
    /** Only shows the SVG */
    onlySvg?: boolean;
  }
  let {
    diagramConf = {},
    debug = false,
    onlySvg = false,
  } : SvgEditorProps = $props();

  let diagramConfClass : DiagramConfClass = new DiagramConfClass();
  $effect(() => {
    diagramConfClass.setConfig(diagramConf)
  })
  setContextDiagram(diagramConfClass)
  
  let allErrors : ErrorsMap = $state({})
  setContextErrors(allErrors)

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

{#if !onlySvg}
  <button onclick={() => {diagramConfClass.getConfig().viewport = {x: 0, y: 0, h: 5, w: 5}}}>Clickme</button>
{/if}

{#if debug}
  <div>
    viewBox="{cm(diagramConfClass.getConfig()?.viewport?.x || 0)} {cm(diagramConfClass.getConfig()?.viewport?.y || 0)} {cm(diagramConfClass.getConfig()?.viewport?.w || 20)} {cm(diagramConfClass.getConfig()?.viewport?.h || 20)}"
  </div>
{/if}

<svg width="100%" height="100%" viewBox="{cm(diagramConfClass.getConfig()?.viewport?.x || 0)} {cm(diagramConfClass.getConfig()?.viewport?.y || 0)} {cm(diagramConfClass.getConfig()?.viewport?.w || 20)} {cm(diagramConfClass.getConfig()?.viewport?.h || 20)}" xmlns="http://www.w3.org/2000/svg" use:panzoom={diagramConfClass} style="touch-action: none;">
  {#each diagramConfClass.getConfig().diagramNodes || [] as node}
    <Node {...node}/>
  {/each}
</svg>

