<script lang="ts">
  /** Theory panel */
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import CreateNodes from './CreateNodes.svelte'
  import AvailableNode from "./AvailableNode.svelte";
  import { stylePanel, styleSelected, styleTitleInTheoryPanel } from "./commonStyles.svelte"
	import Button from '../reusable/Button.svelte';
	import PanelTheoryRule from './PanelTheoryRule.svelte';
  import Collapsable from '../reusable/Collapsable.svelte';
  import PanelTheoryLinkType from './PanelTheoryLinkType.svelte';
  import { keys } from '$lib/utils';

  let diagramConfClass = getContextDiagram()
  let allLinkTypes = $derived(diagramConfClass.getCurrentTheory()?.linkTypes || {})
  let { addPanelCollapsed = $bindable(), createNodeTemplatePanel = $bindable() } = $props()

  let maximizePanel = $state(false)

  let currentTheoryTab = $state<"nodes" | "types" | "rules">("nodes")

</script>
<div class={[
          `absolute left-4 top-1/2 -translate-y-1/2 ${maximizePanel ? "w-7/10" : "w-xs"} min-w-0 h-9/10 flex flex-col items-center transition-all duration-300`,
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
    <button class="tab px-2 py-1 border-r border-gray-100 hover:bg-blue-100/30 " title="Duplicate theory" onclick={() => {maximizePanel = !maximizePanel}}>
      <Icon icon="mdi-light:fullscreen" width="20" height="20"/>
    </button>
  </div>

  <div class={[
             "flex flex-col flex-nowrap gap-2 bg-white/80 h-full overflow-auto mix-h-0 min-w-0 w-full",
             stylePanel,
             ]}>
    <!-- Tabs to switch node <-> rules mode -->
    <div class="flex w-full overflow-hidden border-b border-gray-200 shrink-0 mb-0">
      <button class={["w-1/2 py-2 text-sm font-medium border-r border-gray-200",
                      styleSelected(currentTheoryTab === "nodes")
                      ]}
        onclick={() => currentTheoryTab = "nodes"}>
        Nodes
      </button>
      <button class={["w-1/2 py-2 text-sm font-medium border-r border-gray-200",
                      styleSelected(currentTheoryTab === "types")
                      ]}
        onclick={() => currentTheoryTab = "types"}>
        Types
      </button>
      <button class={["w-1/2 py-2 text-sm font-medium",
                      styleSelected(currentTheoryTab === "rules")
                      ]}
        onclick={() => currentTheoryTab = "rules"}
        >
        Rules
      </button>
    </div>

    <!-- Scroll bar is for this box -->
    <div class="p-2 m-0 h-full overflow-auto overscroll-contain mix-h-0 min-w-0 w-full">

      {#if currentTheoryTab === "nodes"}
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
      {:else if currentTheoryTab === "types"}
        <h1 class={styleTitleInTheoryPanel}>Available types</h1>
        <p class="text-sm mb-3 text-gray-600">
          <Collapsable text="Links can be tagged with a type.">
            This type (integer, bit string…) helps to provide a very basic typing system to verify that a diagram has the right shape, and also to guide the user when building diagrams. For now, types accept no input. Hence, for more complex types that accept parameters (e.g. you want to specify in the type the size of the matrix…), you can introduce a new node, where one or two anchors (depending on whether the type is directed) are reserved for the link itself, and other anchors are reserved for the parameters. Typing of these more complex types may be performed later via rewriting rules once we implement specialization (TODO).
          </Collapsable>
        </p>
        <ul class="list-disc">
          {#each keys(allLinkTypes) as linkTypeID (linkTypeID)}
            <li><PanelTheoryLinkType linkTypeID={linkTypeID} bind:linkType={allLinkTypes[linkTypeID]} /></li>
          {/each}
        </ul>

        <p class="text-center w-full">
          <Button onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.createLinkType()}}>
            <Icon icon="mdi:plus" width="20" height="20" class="mr-2" />
            New link type
          </Button>
        </p>
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
<div id="myportal" class="absolute top-0 left-0 z-500"></div>
