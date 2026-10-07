<script lang="ts">
  import { getContextDiagram } from '#lib/contexts/context.svelte.js';
  import type { NodeKind, AvailableNode, DiagramConf } from '#lib/types/types.js';
  import ContentEditable from '#lib/components/reusable/ContentEditable.svelte';
  import Button from '#lib/components/reusable/Button.svelte';
  import SvgEditor from './SvgEditor.svelte';
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/

  let diagramConfClass = getContextDiagram();

  let { nodeKind, node }: { nodeKind: NodeKind; node: AvailableNode } = $props();

  let subDiagramConf = $derived.by<DiagramConf>(() => ({
    diagrams: {
      main: {
        nodes: {
          myfirstnode: { nodeKind: nodeKind, pos: { x: 0, y: 0 } }
        }
      }
    },
    theories: {
      main: {
        availableNodes: {
          [nodeKind]: node
        }
      }
    },
    tabs: [{ tabKind: 'tabDiagram', diagramID: 'main' }],
    currentTab: { tabKind: 'tabDiagram', diagramID: 'main' },
    proofs: {}
  }));
</script>

<div class="mb-3 text-sm text-gray-600">
  <p>
    <Icon
      icon="ph:arrow-bend-down-right-bold"
      width="15"
      height="15"
      class="mr-1 inline align-baseline"
    />
    Node <ContentEditable
      onedit={(s, t) => {
        diagramConfClass.undoSnapshot();
        const res = diagramConfClass.renameNodeKind(nodeKind, s);
        // If the name already exists, reset to old value
        if (!res) {
          t.innerText = nodeKind;
        }
      }}>{nodeKind}</ContentEditable
    >
    <Button
      tiny
      title="Delete this available node in the theory"
      onclick={() => {
        diagramConfClass.undoSnapshot();
        diagramConfClass.removeAvailableNodeKind(nodeKind);
      }}><Icon icon="mdi:trash-outline" width="15" height="15" /></Button
    >
    <Button
      tiny
      title="Edit the node using the builtin template system"
      onclick={() => {
        diagramConfClass.editNodeTemplate(nodeKind, node);
      }}><Icon icon="bi:vector-pen" width="15" height="15" /></Button
    >
  </p>
  <div class="m-2 touch-none select-none" data-veryydiag-available-node={nodeKind}>
    <SvgEditor onlySvg={1.3} diagramConfParsed={subDiagramConf} />
  </div>
</div>
