<script lang="ts">
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import type { NodeKind, AvailableNode, DiagramConf } from "$lib/types/types";
  import SvgEditor from "./SvgEditor.svelte";
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/

  let diagramConfClass = getContextDiagram()

  let {
    nodeKind,
    node
  }: {nodeKind: NodeKind, node: AvailableNode} = $props()

  let subDiagramConf = $derived.by<DiagramConf>(() => ({
    diagrams: {
      main: {
        nodes: {
          myfirstnode: {nodeKind: nodeKind, pos: {x: 0, y: 0}},
        }
      }
    },
    theories: {
      main: {
        availableNodes: {
          [nodeKind]: node,
        }
      }
    },
    tabs: [{tabKind: "tabDiagram", diagramID: "main"}],
    currentTab: {tabKind: "tabDiagram", diagramID: "main"},
    proofs: {},
  }))
</script>

<div class="text-sm mb-3 text-gray-600">
  <p>
    <Icon icon="ph:arrow-bend-down-right-bold" width="15" height="15" class="inline align-baseline mr-1"/>
    Node <span contenteditable spellcheck="false" role="button" tabindex="0"
               onblur={(e) => {
                      const res = diagramConfClass.renameNodeKind(nodeKind, (e.target as HTMLElement).innerText)
                      // If the name already exists, reset to old value
                      if (!res) {
                        (e.target as HTMLElement).innerText = nodeKind
                      }
                      }}
               onkeydown={(e) => {if (e.key === 'Enter') {(e.target as HTMLElement).blur()}}}
      >{nodeKind}</span>
  </p>
  <div class="m-2" data-proofdiag-available-node={nodeKind} draggable="true">
    <SvgEditor onlySvg={1.3} diagramConfParsed={subDiagramConf}/>
  </div>
</div>
