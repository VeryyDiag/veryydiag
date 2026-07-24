<script lang="ts">
  /** Theory panel */
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import { stylePanel, styleSelected, styleTitleInTheoryPanel } from "./commonStyles.svelte"
  import Toogle from '../reusable/Toogle.svelte';
  import { entries, toBoolean } from '$lib/utils';
	import { getConfig } from 'storybook/test';
	import Button from '../reusable/Button.svelte';
	import type { ProofStep, ProofStepApplyRule, ProofStepMove, ProofStepGroupStart } from '$lib/types/types';
  import ContentEditable from '../reusable/ContentEditable.svelte';

  let diagramConfClass = getContextDiagram()

  let { panelDetailsEnabled = $bindable() } = $props()
  // Same code as in PanelDetails, to know if we will see it or not
  let linkSelection = $derived(diagramConfClass.getLinkSelection())
  let nodeSelection = $derived(diagramConfClass.getNodeSelection())
  let nbSelectedItems = $derived(linkSelection.length + nodeSelection.length)
  let panelDetailsReallyEnabled = $derived(panelDetailsEnabled && nbSelectedItems >= 1)

  let enabled = $derived(diagramConfClass.isInProofMode())
  let currentProof = $derived(enabled ? diagramConfClass.currentProof() : undefined)
  let currentProofStep = $derived(currentProof?.currentStep || 0)

  let styleDot = "absolute w-3 h-3 rounded-full mt-1.5 -start-1.5 border border-buffer"
  let styleDotDisabled = `${styleDot} bg-gray-100 border-gray-200`
  let styleDotEnabled = `${styleDot} bg-green-200 border-green-300`
  let styleLists = "list-disc ml-2"
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
        <ContentEditable
          onedit={(s) => {diagramConfClass.undoSnapshot(); diagramConfClass.updateProofDescription(s)}}>
          {currentProof?.description || "No description, click to edit me"}</ContentEditable>
      </p>
      <ol class="relative border-l border-gray-300 px-3 mx-4 mb-3">
        {#snippet addMoveStep(i: number)}
          <p class="mb-1">
            <Button
              title="Insert a move step"
              class="text-sm"
              tiny
              onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.insertMoveStep(i)}}
              >
              <Icon icon="mdi:plus" width="20" height="20" />Move step
            </Button>
          </p>
        {/snippet}
        {#snippet description(i: number, proofStep: ProofStepApplyRule | ProofStepMove | ProofStepGroupStart)}
          <p class="mb-3 text-muted">
            <ContentEditable
              onedit={(s) => {diagramConfClass.undoSnapshot(); diagramConfClass.updateProofStepDescription(i, s)}}>
              {proofStep?.description || "No description, click to edit me"}
            </ContentEditable>
          </p>
        {/snippet}
        {#snippet dotStep(i: number)}
          <button
            class={currentProofStep === i ? styleDotEnabled : styleDotDisabled}
            onclick={() => {diagramConfClass.setProofCurrentStep(i)}}
            title={`Go to step ${i+1}`}
          ></button>
        {/snippet}
        <li>
          {@render dotStep(0)}
          Starting diagram
          {@render addMoveStep(0)}
        </li>
        {#each (currentProof?.steps || []) as proofStep, i}
          {@const kind = proofStep?.kind}
          {@const error = diagramConfClass.derivedProofDiagrams.get(i+1)?.error}
          <li>
            {@render dotStep(i+1)}
            {#if error !== undefined}
              <div class="p-1 border border-red-100 rounded-md bg-red-100 red-500">
                <b>Error:</b> {error}
              </div>
            {/if}
            {#if kind === "applyRule"}
              Apply rule
              <ul class={styleLists}>
                <li>Rule name: {proofStep?.ruleName}</li>
                <li>Description: {@render description(i, proofStep)}</li>
                <li>Direction: {proofStep?.direction}</li>
                <li>nodeBijectionAB:
                  <ul class={styleLists}>
                    {#each entries(proofStep?.nodeBijectionAB) as [nodeIDA, nodeIDB]}
	                    <li>{nodeIDA} → {nodeIDB}</li>
                    {/each}
                  </ul>
                </li>
                <li>boundaryAnchorsBA:
                  <ul class={styleLists}>
                    {#each entries(proofStep?.boundaryAnchorsBA) as [nodeIDB, nodeIDA]}
	                    <li>{nodeIDB} → {nodeIDA}</li>
                    {/each}
                  </ul>
                </li>
                <li>linkBijectionAB:
                  <ul class={styleLists}>
                    {#each entries(proofStep?.linkBijectionAB) as [linkIDA, linkIDB]}
	                    <li>{linkIDA} → {linkIDB}</li>
                    {/each}
                  </ul>
                </li>
                <li>nodeBijectionCD:
                  <ul class={styleLists}>
                    {#each entries(proofStep?.nodeBijectionCD) as [nodeIDA, nodeIDB]}
	                    <li>{nodeIDA} → {nodeIDB}</li>
                    {/each}
                  </ul>
                </li>
                <li>linkBijectionCD:
                  <ul class={styleLists}>
                    {#each entries(proofStep?.linkBijectionCD) as [linkIDA, linkIDB]}
	                    <li>{linkIDA} → {linkIDB}</li>
                    {/each}
                  </ul>
                </li>
                <li>move:
                  <ul class={styleLists}>
                    {#each entries(proofStep?.move) as [nodeID, point]}
	                    <li>{nodeID} → x: {point?.x} y: {point?.y}</li>
                    {/each}
                  </ul>
                </li>
              </ul>
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
            <Button title="Delete proof step"
              onclick={() => { diagramConfClass.undoSnapshot();
                               diagramConfClass.removeProofStep(i, false)}}>
              <Icon icon="mdi:trash-outline" width="15" height="15" />
            </Button>
            <Button title="Delete all remaining proof steps"
              onclick={() => {diagramConfClass.undoSnapshot();
                               diagramConfClass.removeProofStep(i, true)}}>
              <Icon icon="mdi:trash-outline" width="15" height="15" /> … <Icon icon="mdi:trash-outline" width="15" height="15" />
            </Button>
          </li>
        {/each}
      </ol>
      <p class="text-muted mb-3">
        To continue the proof, select the nodes and links you want to rewrite (including mono-wire boundary links, but excluding multi-wire boundary links), and click on the left panel in the "Rules" tab on the rule you want to apply. You can also Click on the <Button class="text-sm" tiny><Icon icon="mdi:plus" width="20" height="20"/>Move step</Button> buttons above to insert a step that is just moving the nodes.
      </p>
    </div>
</div>
