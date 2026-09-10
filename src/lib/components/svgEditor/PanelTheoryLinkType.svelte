<script lang="ts">
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import type { LinkTypeID, LinkType, DiagramConf } from "$lib/types/types";
  import ContentEditable from '$lib/components/reusable/ContentEditable.svelte'
  import Button from '$lib/components/reusable/Button.svelte'
  import SvgEditor from "./SvgEditor.svelte";
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import Toogle from "../reusable/Toogle.svelte";
	import ColorPicker from 'svelte-awesome-color-picker';
  import Portal from "../reusable/Portal.svelte";

  let diagramConfClass = getContextDiagram()

  let {
    linkTypeID,
    linkType = $bindable()
  }: {linkTypeID: LinkTypeID, linkType: LinkType} = $props()
</script>

<div class="text-sm mb-3 text-gray-600">
  <p>
    <Icon icon="ph:arrow-bend-down-right-bold" width="15" height="15" class="inline align-baseline mr-1"/>
    <ContentEditable
      onedit={(s, t) => {
               diagramConfClass.undoSnapshot();
               const res = diagramConfClass.renameLinkTypeID(linkTypeID, s)
               // If the name already exists, reset to old value
               if (!res) {
                 t.innerText = linkTypeID
               }
               }}
      >{linkTypeID}</ContentEditable> <Button tiny title="Delete this link type in the theory" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.removeAvailableLinkTypeID(linkTypeID)}}><Icon icon="mdi:trash-outline" width="15" height="15" /></Button> <Button tiny title="Apply this style to selected links" onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.setLinkTypeToSelection(linkTypeID)}}><Icon icon="hugeicons:cursor-add-selection-02" width="15" height="15" /></Button>
  </p>
  <div>
    Directed: <Toogle tiny={true} bind:enabled={() => linkType?.directed || false, (v) => linkType.directed = v} />
  </div>
  <div>
    Color: <ColorPicker
             components={{wrapper: Portal}}
	           bind:hex={() => linkType?.look?.color || "#000000",
                        (v) => {if (linkType?.look === undefined) {linkType.look = { color: "#000000" }}; linkType.look.color = v}}
    position="responsive"
    /> {linkType?.look?.color}
  </div>
  <!-- <div class="m-2 touch-none select-none" data-veryydiag-available-node={nodeKind}>
       <SvgEditor onlySvg={1.3} diagramConfParsed={subDiagramConf}/>
       </div> -->
</div>
