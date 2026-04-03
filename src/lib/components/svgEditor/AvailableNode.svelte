<script lang="ts">
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import type { NodeKind, AvailableNode } from "$lib/types/types";
  import SvgEditor from "./SvgEditor.svelte";
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/

  let diagramConfClass = getContextDiagram()

  let {
    nodeKind,
    node
  }: {nodeKind: NodeKind, node: AvailableNode} = $props()

  let subDiagramConf = $derived.by(() => ({
    diagramNodes: {
      myfirstnode: {nodeKind: nodeKind, pos: {x: 0, y: 0}},
    },
    availableNodes: {
      [nodeKind]: node,
    }
  }))  
</script>

<div class="text-sm mb-3 text-gray-600">
  <p><Icon icon="ph:arrow-bend-down-right-bold" width="15" height="15" class="inline align-baseline mr-1"/> Node {nodeKind}</p>
  <div class="m-2" data-cryptodiag-available-node={nodeKind} draggable="true">
    <SvgEditor onlySvg={1.3} diagramConf={subDiagramConf}/>
  </div>
</div>
