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
                         diagramNodes: [
                           {id: "myfirstnode", nodeKind: "myDiscard", pos: {x: 0, y: 0}}
                         ],
                         availableNodes: [
                           {nodeKind: "myDiscard", svgName: "cryptodiagDiscard"}
                         ]
                         }}
  />
</div>
