<script lang="ts">
  import NodeCustom from "./NodeCustom.svelte";
  import svgString from "./NodeDiscard.svg?raw"
  const props = $props();
</script>
<NodeCustom {...props} svgString={svgString} />
