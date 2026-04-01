<script lang="ts">
  import SvgEditor from "$lib/components/svgEditor/SvgEditor.svelte";
  import type { DiagramConfByUser } from "$lib/types/types";

  import { parse } from 'yaml'
  import demoYml from "./demo.yml?raw"
  
  const diagram : DiagramConfByUser = parse(demoYml)
</script>
<div>
  <!-- <SvgEditor diagramConf={diagram} /> -->
  <SvgEditor diagramConf={{
                         diagramNodes: {
                           myfirstnode: {nodeKind: "inputDiscard", pos: {x: 0, y: 0}},
                           mysecondnode: {nodeKind: "discard", pos: {x: 2, y: 0}},
                           mythirdnode: {nodeKind: "discard", pos: {x: 2, y: 1}},
                         },
                         availableNodes: {
                           inputDiscard: {svgName: "cryptodiagInputDiscard"},
                           discard: {svgName: "cryptodiagDiscard"},
                         },
                         links: [
                           {
                             from: "myfirstnode.out.0",
                             to: "mysecondnode.in.0"
                           },
                         ],
                         }}
  />
</div>
