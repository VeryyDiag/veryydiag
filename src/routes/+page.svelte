<script lang="ts">
  import SvgEditor from "$lib/components/svgEditor/SvgEditor.svelte";
  import type { DiagramConf } from "$lib/types/types";

  import { parse } from 'yaml'
  import demoYml from "./demo.yml?raw"
  
  const diagram : DiagramConf = parse(demoYml)
</script>

<h1>SecuDiag</h1>
<div>
  <!-- <SvgEditor diagramConf={diagram} /> -->
  <SvgEditor diagramConf={{
                         diagramNodes: {
                           myfirstnode: {nodeKind: "inputDiscard", pos: {x: 0, y: 0}},
                           mysecondnode: {nodeKind: "discard", pos: {x: 2, y: 0}},
                         },
                         availableNodes: {
                           inputDiscard: {svgName: "cryptodiagInputDiscard"},
                           discard: {svgName: "cryptodiagDiscard"},
                         },
                         links: [
                           {
                             from: "myfirstnode.out0",
                             to: "mysecondnode.in0"
                           },
                         ],
                         }}
  />
</div>
