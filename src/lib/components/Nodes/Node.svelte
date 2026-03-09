<script lang="ts">
  import type { Node } from "$lib/types/types"
  import { nameToComponent } from "$lib/components/Nodes/allNodes"
  import { registerErrors } from "$lib/contexts/context.svelte";

  // This file is used to draw arbitrary nodes
  let props : Node = $props();
  
  const Component = $derived(nameToComponent[props.nodeKind]);

  let errors = $derived(Component !== undefined ? [] :
                        [`Error: the component ${props.nodeKind} does not exist.`]);
  let uid: string = crypto.randomUUID(); // We use it to register errors per component, this uid is the ID of the current component
  registerErrors(uid, () => errors)
</script>
{#if Component !== undefined}
  <Component {...props}/>
{/if}
