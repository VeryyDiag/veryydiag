<script lang="ts">
  /** Theory panel */
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import { stylePanel, styleSelected, styleTitleInTheoryPanel } from "./commonStyles.svelte" 
  import Toogle from '../reusable/Toogle.svelte';
  import { toBoolean } from '$lib/utils';

  let diagramConfClass = getContextDiagram()

  let { panelDetailsEnabled = $bindable() } = $props()

  let linkSelection = $derived(diagramConfClass.getLinkSelection())
  let nodeSelection = $derived(diagramConfClass.getNodeSelection())
  let nbSelectedItems = $derived(linkSelection.size + nodeSelection.size)
  let enabled = $derived(panelDetailsEnabled && nbSelectedItems >= 1)
  
</script>
<div class={[
           "absolute right-4 top-1/2 -translate-y-1/2 w-xs min-w-0 h-9/10 flex flex-col items-center transition-all duration-300",
           stylePanel,
           !enabled && "opacity-0 invisible",
           ]}>

    <!-- Scroll bar is for this box -->
    <div class="p-2 m-0 h-full overflow-auto mix-h-0 min-w-0 w-full">
      <h1 class={styleTitleInTheoryPanel}>Details</h1>
      {#if nbSelectedItems === 1}
        {#if nodeSelection.size === 1}
          {#each nodeSelection as nodeID }
            {@const currentTheory = diagramConfClass.getCurrentTheoryName()}
            {@const node = diagramConfClass.getCurrentDiagram()?.nodes?.[nodeID]}
            {@const paramDefs = (node === undefined) ? {} : diagramConfClass.diagramConfDerivedParams[currentTheory][node.nodeKind]}
            <ul class="list-disc px-5">
              <li>Node ID: <code>{nodeID}</code></li>
              <li>
                Node Kind: <code>{node?.nodeKind}</code>
              </li>
              <li>
                Available parameters:
                <ul class="list-disc px-5">
                  {#each Object.entries(paramDefs) as [paramName, paramDef]}
                    <li><code>{paramName}</code>:
                      {#if paramDef.type === "string"}
                        <input class="border p-1 rounded border-gray-500" oninput={(e) => {diagramConfClass.changeNodeParam(nodeID, paramName, (e.target as HTMLInputElement).value)}} value={node?.params?.[paramName]?.value || paramDef.default} />
                      {:else if paramDef.type === "boolean"}
                        <Toogle tiny={true} enabled={toBoolean(node?.params?.[paramName]?.value || paramDef.default)} onchange={(v) => diagramConfClass.changeNodeParam(nodeID, paramName, v)}/>
                      {:else if paramDef.type === "integer"}
                          <input class="border p-1 rounded border-gray-500" type="number" oninput={(e) => {diagramConfClass.changeNodeParam(nodeID, paramName, (e.target as HTMLInputElement).value)}} value={node?.params?.[paramName]?.value || paramDef.default} />
                      {:else}
                        We provide no way to edit yourself the type "{paramDef.type}". Please report a bug.
                      {/if}
                    </li>
                  {/each}
                </ul>
              </li>
            </ul>
          {/each}
        {/if}
      {/if}
    </div>
</div>

