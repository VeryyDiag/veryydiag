<script lang="ts">
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import type { RuleName, Rule, DiagramConfByUser } from "$lib/types/types";
  import SvgEditor from "./SvgEditor.svelte";
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import Button from "../reusable/Button.svelte";

  let diagramConfClass = getContextDiagram()

  let {
    ruleName = $bindable(),
    rule = $bindable(),
  }: {ruleName: RuleName, rule: Rule} = $props()

  let subDiagramConfLhs : DiagramConfByUser | undefined = $derived.by(() => {
    if (rule?.lhs === undefined) {
      return undefined
    } else {
      return {
        diagrams: {
          main: rule?.lhs
        },
        theories: {
          [`${diagramConfClass.getCurrentTheoryName()}`]:  diagramConfClass.getCurrentTheory()
        }
      }
    }
  })

  let subDiagramConfRhs : DiagramConfByUser | undefined = $derived.by(() => {
    if (rule?.rhs === undefined) {
      return undefined
    } else {
      return {
        diagrams: {
          main: rule?.rhs
        },
        theories: {
          [`${diagramConfClass.getCurrentTheoryName()}`]:  diagramConfClass.getCurrentTheory()
        }
      }
    }
  })

</script>

<div class="text-base mb-3 text-gray-600">
  <p>
    <Icon icon="ph:arrow-bend-down-right-bold" width="15" height="15" class="inline align-baseline mr-1"/>
    Rule
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
            Click on "Lhs" to define me from the current diagram
          </div>
        {:else}
          <SvgEditor onlySvg={1} diagramConf={subDiagramConfLhs} />
        {/if}
      </div>
      <div class="flex-none text-xl">
        =
      </div>
      <div class="grow-1">
        {#if subDiagramConfRhs === undefined}
          <div class="w-28 text-center text-sm">
            Click on "Rhs" to define me from the current diagram
          </div>
        {:else}
          <SvgEditor onlySvg={1} diagramConf={subDiagramConfRhs} />
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
    <Button tiny={true} title="Delete rule" onclick={() => diagramConfClass.deleteRule(ruleName)}>
      <!-- <Icon icon="mdi:trash-outline" width="15" height="15" /> -->
      Delete
    </Button>    
  </div>
</div>
