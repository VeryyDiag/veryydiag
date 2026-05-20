<script lang="ts">
  /** Theory panel */
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import { stylePanel, styleSelected, styleTitleInTheoryPanel } from "./commonStyles.svelte"
  import Toogle from '../reusable/Toogle.svelte';
  import { toBoolean } from '$lib/utils';
	import { getConfig } from 'storybook/test';
	import Button from '../reusable/Button.svelte';
	import type { ProofStep, ProofStepApplyRule, ProofStepMove, ProofStepGroupStart } from '$lib/types/types';

  let diagramConfClass = getContextDiagram()

  let { panelDetailsEnabled = $bindable() } = $props()
  // Same code as in PanelDetails, to know if we will see it or not
  let linkSelection = $derived(diagramConfClass.getLinkSelection())
  let nodeSelection = $derived(diagramConfClass.getNodeSelection())
  let nbSelectedItems = $derived(linkSelection.size + nodeSelection.size)
  let panelDetailsReallyEnabled = $derived(panelDetailsEnabled && nbSelectedItems >= 1)

  let enabled = $derived(diagramConfClass.isInProofMode())
  let currentProof = $derived(enabled ? diagramConfClass.currentProof() : undefined)

  let styleDot = "absolute w-3 h-3 bg-gray-100 rounded-full mt-1.5 -start-1.5 border border-buffer border-gray-200"
</script>
<div class={[
             "absolute right-4 -translate-y-1/2 w-xs min-w-0 flex flex-col items-center transition-all duration-300",
             panelDetailsReallyEnabled ? "top-26/100  h-46/100" : "top-1/2  h-9/10",
             stylePanel,
             !enabled && "opacity-0 invisible",
             ]}>

    <!-- Scroll bar is for this box -->
    <div class="p-2 m-0 h-full overflow-auto mix-h-0 min-w-0 w-full">
      <h1 class={styleTitleInTheoryPanel}>Proof mode</h1>

      <p class="mb-3 text-muted">
        <span contenteditable spellcheck="false" role="button" tabindex="0"
          onblur={(e) => {diagramConfClass.updateProofDescription((e.target as HTMLElement).innerText)}}
          onkeydown={(e) => {if (e.key === 'Enter') {(e.target as HTMLElement).blur()}}}>{currentProof?.description || "No description, click to edit me"}</span>
      </p>
      <ol class="relative border-l border-gray-300 px-3 mx-4 mb-3">
        {#snippet addMoveStep(i: number)}
          <p class="mb-1">
            <Button
              title="Insert a move step"
              class="text-sm"
              tiny
              onclick={() => diagramConfClass.insertMoveStep(i)}
              >
              <Icon icon="mdi:plus" width="20" height="20" />Move step
            </Button>
          </p>
        {/snippet}
        {#snippet description(i: number, proofStep: ProofStepApplyRule | ProofStepMove | ProofStepGroupStart)}
          <p class="mb-3 text-muted">
            <span contenteditable spellcheck="false" role="button" tabindex="0"
              onblur={(e) => {diagramConfClass.updateProofStepDescription(i, (e.target as HTMLElement).innerText)}}
              onkeydown={(e) => {if (e.key === 'Enter') {(e.target as HTMLElement).blur()}}}>{proofStep?.description || "No description, click to edit me"}</span>
          </p>
        {/snippet}
        <li>
          <div class={styleDot}></div>
          {@render addMoveStep(0)}
        </li>
        {#each (currentProof?.steps || []) as proofStep, i}
          {@const kind = proofStep?.kind}
          <li>
            <div class={styleDot}></div>
            Diagram is
            {JSON.stringify(diagramConfClass.derivedProofDiagrams.get(i+1))}
            {#if kind === "applyRule"}
              Apply rule {proofStep?.ruleName}
              {@render description(i, proofStep)}
              {@render addMoveStep(i+1)}
            {:else if kind === "move"}
              Move
              {@render description(i, proofStep)}
              {@render addMoveStep(i+1)}
            {:else if kind === "group"}
              Group {proofStep?.title}
            {:else if kind === "groupEnd"}
              End of group
            {:else}
              Unknown proofStep kind {kind}
            {/if}
          </li>
        {/each}
      </ol>
      <p class="text-muted mb-3">
        To continue the proof, select the nodes and links you want to rewrite (including boundary links), and click on the left panel in the "Rules" tab on the rule you want to apply. You can also Click on the <Button class="text-sm" tiny><Icon icon="mdi:plus" width="20" height="20"/>Move step</Button> buttons above to insert a step that is just moving the nodes.
      </p>
    </div>
</div>
