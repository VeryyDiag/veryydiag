<script lang="ts">
  /** Theory panel */
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import { stylePanel, styleSelected, styleTitleInTheoryPanel } from "./commonStyles.svelte"
  import Toogle from '../reusable/Toogle.svelte';
  import { toBoolean } from '$lib/utils';

  let diagramConfClass = getContextDiagram()

  let { panelDetailsEnabled = $bindable() } = $props()
  // Same code as in PanelDetails, to know if we will see it or not
  let linkSelection = $derived(diagramConfClass.getLinkSelection())
  let nodeSelection = $derived(diagramConfClass.getNodeSelection())
  let nbSelectedItems = $derived(linkSelection.size + nodeSelection.size)
  let panelDetailsReallyEnabled = $derived(panelDetailsEnabled && nbSelectedItems >= 1)

  let enabled = $derived(diagramConfClass.isInProofMode())

</script>
<div class={[
             "absolute right-4 -translate-y-1/2 w-xs min-w-0 flex flex-col items-center transition-all duration-300",
             panelDetailsReallyEnabled ? "top-26/100  h-45/100" : "top-1/2  h-9/10",
             stylePanel,
             !enabled && "opacity-0 invisible",
             ]}>

    <!-- Scroll bar is for this box -->
    <div class="p-2 m-0 h-full overflow-auto mix-h-0 min-w-0 w-full">
      <h1 class={styleTitleInTheoryPanel}>Proof mode</h1>
    </div>
</div>
