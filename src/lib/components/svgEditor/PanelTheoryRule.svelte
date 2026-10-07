<script lang="ts">
  import { getContextDiagram } from '#lib/contexts/context.svelte.js';
  import type { RuleName, Rule, DiagramConfByUser, DiagramConf } from '#lib/types/types.js';
  import SvgEditor from './SvgEditor.svelte';
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import Button from '../reusable/Button.svelte';
  import { untrack } from 'svelte';
  import ContentEditable from '../reusable/ContentEditable.svelte';
  let diagramConfClass = getContextDiagram();

  let { ruleName = $bindable(), rule = $bindable() }: { ruleName: RuleName; rule: Rule } = $props();

  let subDiagramConfLhs: DiagramConf | undefined = $derived.by(() => {
    if (rule?.lhs === undefined) {
      return undefined;
    } else {
      const currentTheoryName = diagramConfClass.getCurrentTheoryName();
      return {
        diagrams: {
          main: { ...rule?.lhs, theory: currentTheoryName } // May differ if we have renamed the theory etc.
        },
        proofs: {},
        tabs: [{ tabKind: 'tabDiagram', diagramID: 'main' }],
        currentTab: { tabKind: 'tabDiagram', diagramID: 'main' },
        theories: {
          [`${currentTheoryName}`]: diagramConfClass.getCurrentTheory()
        }
      };
    }
  });

  let subDiagramConfRhs: DiagramConf | undefined = $derived.by(() => {
    if (rule?.rhs === undefined) {
      return undefined;
    } else {
      const currentTheoryName = diagramConfClass.getCurrentTheoryName();
      return {
        diagrams: {
          main: { ...rule?.rhs, theory: currentTheoryName }
        },
        proofs: {},
        tabs: [{ tabKind: 'tabDiagram', diagramID: 'main' }],
        currentTab: { tabKind: 'tabDiagram', diagramID: 'main' },
        theories: {
          [`${currentTheoryName}`]: diagramConfClass.getCurrentTheory()
        }
      };
    }
  });
</script>

<div class="mb-3 text-base text-gray-600">
  <p>
    <Icon
      icon="ph:arrow-bend-down-right-bold"
      width="15"
      height="15"
      class="mr-1 inline align-baseline"
    />
    <ContentEditable
      onedit={(s, htmlElt) => {
        diagramConfClass.undoSnapshot();
        const res = diagramConfClass.renameRule(ruleName, s);
        // If the name already exists, reset to old value
        if (!res) {
          htmlElt.innerText = ruleName;
        }
      }}>{ruleName}</ContentEditable
    >
  </p>
  <!-- overscroll-x-contain is needed to prevent gesture navigation to change the page when
       scrolling horizontally -->
  <div class="mb-2 min-w-0 overflow-x-auto overscroll-x-contain p-2 pb-4">
    <div class="flex w-max flex-nowrap items-center gap-2">
      <div class="grow-1">
        {#if subDiagramConfLhs === undefined}
          <div class="w-28 text-center text-sm">
            Click on "Set lhs" to define me from the current diagram
          </div>
        {:else}
          <SvgEditor onlySvg={1} diagramConfParsed={subDiagramConfLhs} />
        {/if}
      </div>
      <div class="flex-none text-xl">=</div>
      <div class="grow-1">
        {#if subDiagramConfRhs === undefined}
          <div class="w-28 text-center text-sm">
            Click on "Set rhs" to define me from the current diagram
          </div>
        {:else}
          <SvgEditor onlySvg={1} diagramConfParsed={subDiagramConfRhs} />
        {/if}
      </div>
    </div>
  </div>
  <div class="text-center">
    <Button
      tiny={true}
      title="Set lhs based on current diagram"
      onclick={() => {
        diagramConfClass.undoSnapshot();
        diagramConfClass.setRuleLhs(ruleName);
      }}
    >
      <!-- <Icon icon="teenyicons:left-solid" width="15" height="15" /> -->
      Set lhs
    </Button>
    <Button
      tiny={true}
      title="Set rhs based on current diagram"
      onclick={() => {
        diagramConfClass.undoSnapshot();
        diagramConfClass.setRuleRhs(ruleName);
      }}
    >
      <!-- <Icon icon="teenyicons:right-solid" width="15" height="15" /> -->
      Set rhs
    </Button>
    <Button
      tiny={true}
      title="Edit lhs in a new diagram"
      onclick={() => {
        diagramConfClass.undoSnapshot();
        diagramConfClass.addDiagram(
          undefined,
          { ...$state.snapshot(rule?.lhs), name: `LHS ${ruleName}` },
          undefined
        );
      }}
    >
      Edit LHS
    </Button>
    <Button
      tiny={true}
      title="Edit rhs in a new diagram"
      onclick={() => {
        diagramConfClass.undoSnapshot();
        diagramConfClass.addDiagram(
          undefined,
          { ...$state.snapshot(rule?.rhs), name: `RHS ${ruleName}` },
          undefined
        );
      }}
    >
      Edit RHS
    </Button>
    <Button
      tiny={true}
      title="Delete rule"
      onclick={() => {
        diagramConfClass.undoSnapshot();
        console.log('undo');
        diagramConfClass.deleteRule(ruleName);
      }}
    >
      <!-- <Icon icon="mdi:trash-outline" width="15" height="15" /> -->
      Delete
    </Button>
    <Button
      tiny={true}
      title="Apply rule (left to right)"
      onclick={() => {
        diagramConfClass.undoSnapshot();
        diagramConfClass.applyRule(ruleName, 'lr');
      }}
    >
      <!-- <Icon icon="mdi:trash-outline" width="15" height="15" /> -->
      Apply <Icon
        icon="material-symbols:arrow-right-alt-rounded"
        width="20"
        height="20"
        class="ml-1 inline align-baseline"
      />
    </Button>
    <Button
      tiny={true}
      title="Apply rule (right to left)"
      onclick={() => {
        diagramConfClass.undoSnapshot();
        diagramConfClass.applyRule(ruleName, 'rl');
      }}
    >
      <!-- <Icon icon="mdi:trash-outline" width="15" height="15" /> -->
      Apply <Icon
        icon="material-symbols:arrow-left-alt-rounded"
        width="20"
        height="20"
        class="ml-1 inline align-baseline"
      />
    </Button>
  </div>
</div>
