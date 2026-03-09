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

<div class="">
  <svg width="100%" height="100%" viewBox="{cm(diagramConf?.viewport?.x || 0)} {cm(diagramConf?.viewport?.y || 0)} {cm(diagramConf?.viewport?.w || 20)} {cm(diagramConf?.viewport?.h || 20)}" xmlns="http://www.w3.org/2000/svg" >
    {#each diagramConf.diagramNodes || [] as node}
      <Node {...node}/>
    {/each}
  </svg>
</div>
