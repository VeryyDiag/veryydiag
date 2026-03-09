<script lang="ts">
  import type { DiagramConf } from "$lib/types/types"
  import Node from "$lib/components/Nodes/Node.svelte"  
  import { setContextDiagram, setContextErrors, type ErrorsMap, registerErrors, DiagramConfClass } from "$lib/contexts/context.svelte";
  import { panzoom } from "$lib/components/svgEditor/navigateSVG.svelte"
  import { cm } from "$lib/utils"
  
  let {
    diagramConf = {}
  } : {
    diagramConf: DiagramConf
  } = $props();

  let diagramConfClass : DiagramConfClass = new DiagramConfClass();
  $effect(() => {
    diagramConfClass.setConfig(diagramConf)
  })
  setContextDiagram(diagramConfClass)
  
  let allErrors : ErrorsMap = $state({})
  setContextErrors(allErrors)

</script>

{#each Object.entries(allErrors) as [uid, errors]}
  {#each errors as error}
    <p style="color: red;">
      Error: {error}
    </p>
  {/each}
{/each}

<button onclick={() => {diagramConfClass.getConfig().viewport = {x: 0, y: 0, h: 5, w: 5}}}>Clickme</button>

<div>
  viewBox="{cm(diagramConfClass.getConfig()?.viewport?.x || 0)} {cm(diagramConfClass.getConfig()?.viewport?.y || 0)} {cm(diagramConfClass.getConfig()?.viewport?.w || 20)} {cm(diagramConfClass.getConfig()?.viewport?.h || 20)}"
</div>

<div class="">
  <svg width="100%" height="100%" viewBox="{cm(diagramConfClass.getConfig()?.viewport?.x || 0)} {cm(diagramConfClass.getConfig()?.viewport?.y || 0)} {cm(diagramConfClass.getConfig()?.viewport?.w || 20)} {cm(diagramConfClass.getConfig()?.viewport?.h || 20)}" xmlns="http://www.w3.org/2000/svg" use:panzoom={diagramConfClass} style="touch-action: none;">
    {#each diagramConfClass.getConfig().diagramNodes || [] as node}
      <Node {...node}/>
    {/each}
  </svg>
</div>

