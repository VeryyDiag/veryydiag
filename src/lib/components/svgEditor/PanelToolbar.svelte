<script lang="ts">
  /** Toolbar panel */
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { getContextDiagram } from "$lib/contexts/context.svelte";

  import { stylePanel, styleButton, styleButtonEnabled, styleButtonDisabled, dividerStyle, styleSelected } from "./commonStyles.svelte"
	import { isDeepEqual } from '$lib/utils';

  let diagramConfClass = getContextDiagram()

  let {
    addPanelCollapsed = $bindable(),
    downloadPanel = $bindable(),
    loadFilePanel = $bindable(),
    panelDetailsEnabled = $bindable(),
    resetViewport,
  } = $props()


  function closePanels() {
    loadFilePanel = false
    downloadPanel = false
  }

  let isSaved = $derived(diagramConfClass.isSaved)

</script>
<div class={["absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center"]}>

  <!-- Tabs for diagrams -->
  <div class="flex gap-0 p-0 rounded-t-xl bg-white/80 backdrop-blur-md border border-b-0 border-gray-200 shadow-lg overflow-hidden">
    <button class="tab px-2 py-1 border-r border-gray-100 hover:bg-blue-100/30 " title="Remove current tab" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.removeTab()}}>
      <Icon icon="mdi:minus" width="20" height="20"/>
    </button>
    {#each diagramConfClass.getConfig()?.tabs as tab}
      {@const currentTab = isDeepEqual(tab, diagramConfClass.getConfig().currentTab)}
      {@const currentTabKind = tab?.tabKind === "tabDiagram" ? "diagram" : "proof"}
      <span contenteditable={currentTab} spellcheck="false" role="button" tabindex="0"
        class={[
                "px-2 py-1 border-r border-gray-100 text-sm",
                styleSelected(currentTab)
                ]}
        title={currentTab ? `Click to edit the name of the current ${currentTabKind} tab` : "Click to change the current tab"}
        onclick={(e) => {if (!currentTab) {diagramConfClass.changeTab(tab); (e.target as HTMLElement).blur()}}}
        onblur={(e) => {if (currentTab) {diagramConfClass.getCurrentTabObject().name = (e.target as HTMLElement).innerText}}}
        onkeydown={(e) => {if (e.key === 'Enter') {(e.target as HTMLElement).blur()}}}
        >
        {diagramConfClass.getTabObject(tab).name || "No name"}
      </span>
    {/each}
    <button class="tab px-2 py-1 border-r border-gray-100 hover:bg-blue-100/30 " title="Add new diagram" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.addDiagram()}}>
      <Icon icon="mdi:plus" width="20" height="20"/>
    </button>
  </div>


  <div class={["flex gap-2 p-2 rounded-t-xl", stylePanel]}>
    <button id="reframeBtn"
            class="p-2 rounded-lg transition active:scale-95">
      <b class="">Ver
        <!-- <span class="relative -ml-[.3ex] transform rotate-180 inline-block top-1 top-[.4ex]">λ</span>
        --><!-- Supposed to look like a flipped lambda -->
        <span class="inline-block scale-x-[-1] -ml-1">y</span>
        <span class="-ml-[.2em]">y</span>
      </b>Diag
    </button>

    <!-- Creation mode -->
    <button
      class={[styleButton, styleButtonEnabled]} title="Diagram creation mode" >

      <Icon icon="fluent-mdl2:edit-create" width="25" height="25" />
    </button>

    <!-- Proof mode -->
    <button
      class={[styleButton, styleButtonDisabled]}
      title="Start the proof mode"
      onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.addProof()}}
    >

      <Icon icon="streamline:triangle-arrow-roadmap-remix" color="black" width="25" height="25" />
    </button>


    <!-- ========== Divider for generic tools ========== -->
    <div class={dividerStyle}></div>
    <!-- <div class="h-10 border-l border-dashed border-gray-300 mx-1"></div> -->
    <!-- <div class="w-px h-5 bg-gradient-to-b from-transparent via-gray-500 to-transparent mx-1"></div> -->

    <!-- Load button -->
    <button id="reframeBtn"
            title="Load diagram"
            class={[styleButton, loadFilePanel ? styleButtonEnabled : styleButtonDisabled]}
            onclick={() => {closePanels(); loadFilePanel = !loadFilePanel}}
      >
      <Icon icon="material-symbols:file-open-outline" width="25" height="25"/>
    </button>


    <!-- Download button -->
    <button
      id="reframeBtn"
      title="Download diagram/proof or download SVG"
      class={[styleButton, isSaved ? "bg-green-100 hover:bg-green-200"
              : (downloadPanel ? styleButtonEnabled : styleButtonDisabled)]}
      onclick={() => {closePanels(); downloadPanel = !downloadPanel}}
      >
      <!-- Icon: fit / reset view -->
      <Icon icon="material-symbols:sim-card-download-outline" width="25" height="25"/>
    </button>


    <!-- Reframe button -->
    <button class={[styleButton, styleButtonDisabled]}
            onclick={() => {diagramConfClass.undoSnapshot(); resetViewport}}
            title="Reset view"
    >
      <!-- Icon: fit / reset view -->
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
        fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
      </svg>
    </button>

    <!-- Select All -->
    <button class={[styleButton, styleButtonDisabled]}
      onclick={diagramConfClass.selectAll}
      title="Select all nodes and links"
    >
      <Icon icon="fluent:select-all-on-16-regular" width="25" height="25"/>
    </button>

    <!-- Undo -->
    <button class={[styleButton, styleButtonDisabled]}
      onclick={diagramConfClass.undo}
      title="Undo"
    >
      <Icon icon="material-symbols:undo" width="25" height="25"
        class={diagramConfClass.undoStack.length > 0 ? "" : "text-gray-300"} />
    </button>

    <!-- Redo -->
    <button class={[styleButton, styleButtonDisabled]}
      onclick={diagramConfClass.redo}
      title="Redo"
    >
      <Icon icon="material-symbols:redo" width="25" height="25"
        class={diagramConfClass.redoStack.length > 0 ? "" : "text-gray-300"} />
    </button>

    <!-- ========== Divider for mode-specific tools ========== -->
    <div class={dividerStyle}></div>

    <!-- Add tool -->
    <button
      class={[
            styleButton,
            addPanelCollapsed && styleButtonDisabled,
            !addPanelCollapsed && styleButtonEnabled
            ]}
      onclick={() => {addPanelCollapsed = !addPanelCollapsed}}
      title="Show/hide pannel to create nodes/rules"
      >
      <Icon icon="mdi:plus" width="25" height="25"/>
    </button>

    <!-- Add tool -->
    <button
      class={[
            styleButton,
            panelDetailsEnabled ? styleButtonEnabled : styleButtonDisabled
            ]}
      onclick={() => {panelDetailsEnabled = !panelDetailsEnabled}}
      title="Show/hide detail panel when selecting a node"
      >
      <Icon icon="mdi:card-account-details-outline" width="30" height="30"/>
    </button>

    <!-- Remove tool -->
    <button
      class={[ styleButton, styleButtonDisabled ]}
      onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.removeSelection()}}
      title="Delete selection (click to select)"
      >
      <Icon icon="mdi:trash-outline" width="25" height="25" />
    </button>
  </div>

</div>
