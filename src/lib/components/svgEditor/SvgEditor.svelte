<script lang="ts">
  import type { DiagramConf } from "$lib/types/types"
  import type { Writable } from "svelte/store"
  import Node from "$lib/components/Nodes/Node.svelte"  
  import { setContextDiagram, setContextErrors, type ErrorsMap } from "$lib/contexts/context"
  import { writable } from "svelte/store"

  
  let {
    diagramConf = {}
  } : {
    diagramConf: DiagramConf
  } = $props();

  let diagramConfStore : Writable<DiagramConf> = writable({})
  setContextDiagram(diagramConfStore)
  $effect(() => {
    diagramConfStore.set(diagramConf);
  });
  let errorsStore : Writable<ErrorsMap> = writable({})
  setContextErrors(errorsStore)
  
</script>

{#each Object.entries($errorsStore) as [uid, errors]}
  {#each errors as error}
    <p style="color: red;">
      Error: {error}
    </p>
  {/each}
{/each}

<svg with="100%" height="100%" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  {#each $diagramConfStore?.diagramNodes || [] as node}
    <Node {...node}/>
  {/each}
</svg>
