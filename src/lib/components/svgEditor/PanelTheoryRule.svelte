<script lang="ts">
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import type { RuleName, Rule, DiagramConfByUser, DiagramConf } from "$lib/types/types";
  import SvgEditor from "./SvgEditor.svelte";
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import Button from "../reusable/Button.svelte";
  import { untrack } from "svelte";
  let diagramConfClass = getContextDiagram()

  let {
    ruleName = $bindable(),
    rule = $bindable(),
  }: {ruleName: RuleName, rule: Rule} = $props()

  let subDiagramConfLhs : DiagramConf | undefined = $derived.by(() => {
    if (rule?.lhs === undefined) {
      return undefined
    } else {
      return {
        diagrams: {
          main: rule?.lhs
        },
        proofs: {},
        tabs: [{ tabKind: "tabDiagram", diagramID: "main" }],
        currentTab: { tabKind: "tabDiagram", diagramID: "main" },
        theories: {
          [`${diagramConfClass.getCurrentTheoryName()}`]: diagramConfClass.getCurrentTheory()
        },
      }
    }
  })

  let subDiagramConfRhs : DiagramConf | undefined = $derived.by(() => {
    if (rule?.rhs === undefined) {
      return undefined
    } else {
      return {
        diagrams: {
          main: rule?.rhs
        },
        proofs: {},
        tabs: [{ tabKind: "tabDiagram", diagramID: "main" }],
        currentTab: { tabKind: "tabDiagram", diagramID: "main" },
        theories: {
          // Issue: we can't
          [`${diagramConfClass.getCurrentTheoryName()}`]: diagramConfClass.getCurrentTheory()
        },
      }
    }
  })

</script>

<div class="text-base mb-3 text-gray-600">
  <p>
    <Icon icon="ph:arrow-bend-down-right-bold" width="15" height="15" class="inline align-baseline mr-1"/>
    <span contenteditable spellcheck="false" role="button" tabindex="0"
          onblur={(e) => {
                 const res = diagramConfClass.renameRule(ruleName, (e.target as HTMLElement).innerText)
                 // If the name already exists, reset to old value
                 if (!res) {
                   (e.target as HTMLElement).innerText = ruleName
                 }}}
      onkeydown={(e) => {if (e.key === 'Enter') {(e.target as HTMLElement).blur()}}}
      >{ruleName}</span>
  </p>
  <div class="min-w-0 overflow-x-auto mb-2 p-2 pb-4">
    <div class="flex flex-nowrap items-center w-max gap-2">
      <div class="grow-1">
        {#if subDiagramConfLhs === undefined}
          <div class="w-28 text-center text-sm">
            Click on "Set lhs" to define me from the current diagram
          </div>
        {:else}
          <SvgEditor onlySvg={1} diagramConfParsed={subDiagramConfLhs} />
        {/if}
      </div>
      <div class="flex-none text-xl">
        =
      </div>
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
    <Button tiny={true} title="Set lhs based on current diagram" onclick={() => diagramConfClass.setRuleLhs(ruleName)}>
      <!-- <Icon icon="teenyicons:left-solid" width="15" height="15" /> -->
      Set lhs
    </Button>
    <Button tiny={true} title="Set rhs based on current diagram" onclick={() => diagramConfClass.setRuleRhs(ruleName)}>
      <!-- <Icon icon="teenyicons:right-solid" width="15" height="15" /> -->
      Set rhs
    </Button>
    <Button tiny={true} title="Edit lhs in a new diagram" onclick={() => diagramConfClass.addDiagram(undefined, {...$state.snapshot(rule?.lhs), name: `LHS ${ruleName}`}, undefined)}>
      Edit LHS
    </Button>
    <Button tiny={true} title="Edit rhs in a new diagram" onclick={() => diagramConfClass.addDiagram(undefined, {...$state.snapshot(rule?.rhs), name: `RHS ${ruleName}`}, undefined)}>
      Edit RHS
    </Button>
    <Button tiny={true} title="Delete rule" onclick={() => diagramConfClass.deleteRule(ruleName)}>
      <!-- <Icon icon="mdi:trash-outline" width="15" height="15" /> -->
      Delete
    </Button>
    <Button tiny={true} title="Apply rule (left to right)" onclick={() => diagramConfClass.applyRule(ruleName, "lr")}>
      <!-- <Icon icon="mdi:trash-outline" width="15" height="15" /> -->
      Apply <Icon icon="material-symbols:arrow-right-alt-rounded" width="20" height="20" class="inline align-baseline ml-1" />
    </Button>
    <Button tiny={true} title="Apply rule (right to left)" onclick={() => diagramConfClass.applyRule(ruleName, "rl")}>
      <!-- <Icon icon="mdi:trash-outline" width="15" height="15" /> -->
      Apply <Icon icon="material-symbols:arrow-left-alt-rounded" width="20" height="20" class="inline align-baseline ml-1" />
    </Button>
  </div>
</div>
