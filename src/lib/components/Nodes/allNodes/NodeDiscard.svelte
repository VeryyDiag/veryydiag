<script lang="ts">
  // Mostly to test my code
  import NodeGeneric from './NodeGeneric.svelte';
  import svgString from './NodeDiscard.svg?raw';
  const props = $props();
</script>

<NodeGeneric {...props} {svgString} />
