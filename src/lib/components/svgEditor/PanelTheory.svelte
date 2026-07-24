<script lang="ts">
  /** Theory panel */
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import CreateNodes from './CreateNodes.svelte'
  import AvailableNode from "./AvailableNode.svelte";
  import { stylePanel, styleSelected, styleTitleInTheoryPanel } from "./commonStyles.svelte"
	import Button from '../reusable/Button.svelte';
	import PanelTheoryRule from './PanelTheoryRule.svelte';

  let diagramConfClass = getContextDiagram()

  let { addPanelCollapsed = $bindable(), createNodeTemplatePanel = $bindable() } = $props()

  let isEditingRules = $state(false)

</script>
<div class={[
            "absolute left-4 top-1/2 -translate-y-1/2 w-xs min-w-0 h-9/10 flex flex-col items-center transition-all duration-300",
            addPanelCollapsed && "opacity-0 invisible",
            ]}>
  <!-- Tabs for theories -->
  <div class="flex gap-0 p-0 rounded-t-xl bg-white/80 backdrop-blur-md border border-b-0 border-gray-200 shadow-lg overflow-hidden">
    <button class="tab px-2 py-1 border-r border-gray-100 hover:bg-blue-100/30 " title="Remove current theory" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.removeTheory()}}>
      <Icon icon="mdi:minus" width="20" height="20"/>
    </button>
    {#each Object.entries(diagramConfClass.getConfig()?.theories) as [theoryID, theory] (theoryID)}
      {@const currentTheory = theoryID === diagramConfClass.getCurrentDiagram().theory}
      <span contenteditable={currentTheory} role="button" tabindex="0"
        class={[
                "px-2 py-1 border-r border-gray-100 text-sm",
                styleSelected(currentTheory)
                ]}
        title={currentTheory ? "Click to edit the name of the current theory" : "Click to modify the theory of the current diagram"}
        onclick={(e) => {if (!currentTheory) {diagramConfClass.undoSnapshot(); diagramConfClass.changeTheory(theoryID); (e.target as HTMLElement).blur()}}}
        onblur={(e) => {if (currentTheory) {diagramConfClass.getConfig().theories[theoryID].theoryName = (e.target as HTMLElement).innerText}}}
        onkeydown={(e) => {if (e.key === 'Enter') {(e.target as HTMLElement).blur()}}}
        >
        {diagramConfClass.getConfig()?.theories[theoryID]?.theoryName || "No name"}
      </span>
    {/each}
    <button class="tab px-2 py-1 border-r border-gray-100 hover:bg-blue-100/30 " title="Create empty theory" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.addTheory(undefined, {})}}>
      <Icon icon="mdi:plus" width="20" height="20"/>
    </button>
    <button class="tab px-2 py-1 border-r border-gray-100 hover:bg-blue-100/30 " title="Duplicate theory" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.addTheory()}}>
      <Icon icon="famicons:duplicate-outline" width="20" height="20"/>
    </button>
  </div>

  <div class={[
             "flex flex-col flex-nowrap gap-2 bg-white/80 h-full overflow-auto mix-h-0 min-w-0 w-full",
             stylePanel,
             ]}>
    <!-- Tabs to switch node <-> rules mode -->
    <div class="flex w-full overflow-hidden border-b border-gray-200 shrink-0 mb-0">
      <button class={["w-1/2 py-2 text-sm font-medium border-r border-gray-200",
                    styleSelected(!isEditingRules)
                    ]}
              onclick={() => isEditingRules = false}>
        Nodes
      </button>
      <button class={["w-1/2 py-2 text-sm font-medium",
                    styleSelected(isEditingRules)
                    ]}
              onclick={() => isEditingRules = true}
        >
        Rules
      </button>
    </div>

    <!-- Scroll bar is for this box -->
    <div class="p-2 m-0 h-full overflow-auto overscroll-contain mix-h-0 min-w-0 w-full">

      {#if !isEditingRules}
        <!-- ========== Nodes ========== -->
        <h1 class={styleTitleInTheoryPanel}>Available nodes</h1>
        <p class="text-sm mb-3 text-gray-600">
          Drag and drop a node to add it to your diagram (click to edits its name).
        </p>
        <ul class="list-disc">
          {#each Object.entries(diagramConfClass.getCurrentTheory()?.availableNodes || {}) as [nodeKind, node] (nodeKind)}
            <li><AvailableNode nodeKind={nodeKind} node={node} /></li>
          {/each}
        </ul>

        <CreateNodes bind:createNodeTemplatePanel={createNodeTemplatePanel} />
      {:else}
        <!-- ========== Rules ========== -->
        <h1 class={styleTitleInTheoryPanel}>Available rules</h1>
        <ul class="list-disc">
          {#each Object.entries(diagramConfClass.getCurrentTheory()?.rules || {}) as [ruleName, rule]  (ruleName)}
            <li>
              <PanelTheoryRule ruleName={ruleName} rule={rule} />
            </li>
          {/each}
        </ul>
        <h1 class={styleTitleInTheoryPanel}>Create rule</h1>
        <p class="text-center w-full">
          <Button onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.createRule()}}>
            <Icon icon="mdi:plus" width="20" height="20" class="mr-2" />
            New rule
          </Button>
        </p>
      {/if}
    </div>
  </div>
</div>
