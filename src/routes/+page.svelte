<script lang="ts">
  import SvgEditor from "$lib/components/svgEditor/SvgEditor.svelte";
  import type { DiagramConfByUser } from "$lib/types/types";

  import { parse } from 'yaml'
  import demoYml from "./demo.yaml.veryydiag?raw"

  const diagram : DiagramConfByUser = parse(demoYml)
</script>
<div>
  <!-- <SvgEditor diagramConf={diagram} /> -->
  <!-- <div id="foo" style="visibility: hidden"></div>-->
  <SvgEditor diagramConf={diagram}
  />
</div>
