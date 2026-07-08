<script lang="ts">
  /** Theory panel */
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import { stylePanel, hr, styleTitleInTheoryPanel, styleTitle2InTheoryPanel } from "./commonStyles.svelte"
  import Toogle from '../reusable/Toogle.svelte';
  import ContentEditable from '../reusable/ContentEditable.svelte';
  import { toBoolean } from '$lib/utils';
  import Button from '../reusable/Button.svelte';

  let diagramConfClass = getContextDiagram()

  let { panelDetailsEnabled = $bindable() } = $props()

  let linkSelection = $derived(diagramConfClass.getLinkSelection())
  let nodeSelection = $derived(diagramConfClass.getNodeSelection())
  let nbSelectedItems = $derived(linkSelection.length + nodeSelection.length)
  let enabled = $derived(panelDetailsEnabled && nbSelectedItems >= 1)

  // We need to know if we are in proof mode since we shrink in proof mode
  let proofModeEnabled = $derived(diagramConfClass.isInProofMode())

</script>
<div class={[
                "absolute right-4 -translate-y-1/2 w-xs min-w-0 flex flex-col items-center transition-all duration-300",
                proofModeEnabled ? "top-74/100 h-46/100" : "top-1/2  h-9/10",
                stylePanel,
                !enabled && "opacity-0 invisible",
                ]}>

    <!-- Scroll bar is for this box -->
    <div class="p-2 m-0 h-full overflow-auto mix-h-0 min-w-0 w-full">
      <h1 class={styleTitleInTheoryPanel}>Details</h1>
      {#if nbSelectedItems >= 1}
        {#each nodeSelection as nodeID }
          {@const currentTheoryID = diagramConfClass.getCurrentTheoryName()}
          {@const node = diagramConfClass.getCurrentDiagram()?.nodes?.[nodeID]}
          {@const paramDefs = (node === undefined) ? {} : diagramConfClass.getParamSpecs(currentTheoryID, node.nodeKind) || {}}
          {#if node !== undefined }
            <hr class={hr}>
            <ul class="list-disc px-5">
              <li>Node ID: <ContentEditable
                             onedit={(s) => {diagramConfClass.undoSnapshot(); diagramConfClass.tryOrSendNotificationError(
                               () => diagramConfClass.renameNodeID(nodeID, s))}}
                >{nodeID}</ContentEditable></li>
              <li>
                Node Kind: <code>{node?.nodeKind}</code>
              </li>
              <li>
                Available parameters:
                <ul class="list-disc px-5">
                  {#each Object.entries(paramDefs) as [paramName, paramDef]}
                    <li><code>{paramName}</code>:
                      {#if paramDef.type === "string"}
                        <input class="border p-1 rounded border-gray-500" oninput={(e) => {diagramConfClass.changeNodeParam(nodeID, paramName, (e.target as HTMLInputElement).value)}} value={diagramConfClass.getParamFromNode(node, currentTheoryID, paramName)} />
                      {:else if paramDef.type === "boolean"}
                        <Toogle tiny={true} enabled={toBoolean(diagramConfClass.getParamFromNode(node, currentTheoryID, paramName))} onchange={(v) => diagramConfClass.changeNodeParam(nodeID, paramName, v)}/>
                      {:else if paramDef.type === "integer"}
                          <input class="border p-1 rounded border-gray-500" type="number" oninput={(e) => {diagramConfClass.changeNodeParam(nodeID, paramName, (e.target as HTMLInputElement).value)}} value={diagramConfClass.getParamFromNode(node, currentTheoryID, paramName)} />
                      {:else}
                          We provide no way to edit yourself the type "{paramDef.type}". Please report a bug.
                      {/if}
                    </li>
                  {/each}
                </ul>
              </li>
            </ul>
            <Button title="Select only this node" tiny={true} ss="text-sm" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.clearSelection(); diagramConfClass.addNodeSelection(nodeID)}}>
              <Icon icon="hugeicons:cursor-add-selection-02" width="18" height="18" />
            </Button>
            <Button title="Un-Select" tiny={true} class="text-sm" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.removeNodeSelection(nodeID)}}>
              <Icon icon="hugeicons:cursor-remove-selection-02" width="18" height="18"/>
            </Button>
            <Button title="Remove" tiny={true} class="text-sm" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.removeNode(nodeID)}}>
              <Icon icon="mdi:trash-outline" width="18" height="18" />
            </Button>
          {/if}
        {/each}
        {#each linkSelection as linkID }
          {@const link = diagramConfClass.getCurrentDiagram()?.linksWithID?.[linkID]}
          {#if link !== undefined }
            <hr class={hr}>
            <ul class="list-disc px-5">
              <li>Link ID:
                <ContentEditable onedit={(s) => diagramConfClass.tryOrSendNotificationError(
                                          () => diagramConfClass.renameLinkID(linkID, s))}>
                  {linkID}
                </ContentEditable>
              </li>
              <li>From: <code>{link?.from}</code></li>
              <li>To: <code>{link?.to}</code></li>
            </ul>
            <Button title="Select only this link" tiny={true} ss="text-sm" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.clearSelection(); diagramConfClass.addLinkSelection(linkID)}}>
              <Icon icon="hugeicons:cursor-add-selection-02" width="18" height="18" />
            </Button>
            <Button title="Un-Select" tiny={true} class="text-sm" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.removeLinkSelection(linkID)}}>
              <Icon icon="hugeicons:cursor-remove-selection-02" width="18" height="18"/>
            </Button>
            <Button title="Remove" tiny={true} class="text-sm" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.removeLink(linkID)}}>
              <Icon icon="mdi:trash-outline" width="18" height="18" />
            </Button>
          {/if}
        {/each}
        <hr class={hr}>
      {/if}
    </div>
</div>
