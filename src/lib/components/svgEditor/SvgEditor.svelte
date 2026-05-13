<script lang="ts">
  import type { DiagramConfByUser, Error } from "$lib/types/types"
  import Node from "$lib/components/Nodes/Node.svelte"
  import Link from "$lib/components/Links/Link.svelte"
  import { setContextDiagram, setContextErrors, type ErrorsMap, registerErrors, DiagramConfClass } from "$lib/contexts/context.svelte";
  import { panzoom, drawLink, selectElement, drag, removeSelection, addNodeToDiagram, pasteFile } from "$lib/components/svgEditor/navigateSVG.svelte"
  import { cm, randomID } from "$lib/utils"
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { stylePanel, styleButton, styleButtonEnabled, styleButtonDisabled, dividerStyle, styleSelected } from "./commonStyles.svelte"

  // Import the various panels
  import PanelError from './PanelError.svelte';
  import PanelNotifications from './PanelNotifications.svelte';
  import PanelLoadFile from "./PanelLoadFile.svelte";
  import PanelDownload from "./PanelDownload.svelte";
  import PanelTheory from "./PanelTheory.svelte";
  import PanelToolbar from "./PanelToolbar.svelte";
  import PanelDetails from "./PanelDetails.svelte";
  import PanelProofMode from "./PanelProofMode.svelte";

  /**
   * Interactive SVG editor component
   */

  interface SvgEditorProps {
    /** My diagramConf config */
    diagramConf: DiagramConfByUser;
    /** Enable some extra information when debugging */
    debug?: boolean;
    /**
     * Only prints like a fixed image SVG (can't pan, modify etc) when number is defined.
     * The number represents the zoom (set to 1 to print 1 by default).
     */
    onlySvg?: number;
  }
  let {
    diagramConf = {},
    debug = false,
    onlySvg = undefined,
  } : SvgEditorProps = $props();

  let diagramConfClass : DiagramConfClass = new DiagramConfClass();
  setContextDiagram(diagramConfClass)

  let allErrors = $state<ErrorsMap>({})
  setContextErrors(allErrors)

  let errorsImport = $state<Error | undefined>(undefined)
  $effect(() => {
    try {
      errorsImport = diagramConfClass.setConfig(diagramConf)
    } catch (err) {
      errorsImport = {message: `Error while importing the configuration (${err})`}
    }
  })

  const resetViewport = () => diagramConfClass.fitViewportToContent({scale: onlySvg, breathe: onlySvg === undefined})
  $effect(() => {diagramConf; resetViewport()})

  let uid: string = randomID(); // We use it to register errors per component, this uid is the ID of the current component
  let errors = $derived(errorsImport ? [errorsImport.message] : [])
  registerErrors(uid, () => errors)

  let svgRef : SVGGraphicsElement | undefined = undefined
  $effect(() => {
    diagramConfClass.setSvg(svgRef)
  })

  $effect(() => {
    if (onlySvg !== undefined) {
      resetViewport()
    }
  })

  let proofMode = diagramConfClass.isInProofMode()

  let addPanelCollapsed = $state(false);
  let loadFilePanel = $state(false)
  let downloadPanel = $state(false)
  let panelDetailsEnabled = $state(true)

</script>

{#snippet svg(width: string | number, height: string | number)}
  <svg bind:this={svgRef}
       width={width}
       height={height}
       overflow="hidden"
       viewBox="{cm(diagramConfClass.getViewport().x)} {cm(diagramConfClass.getViewport().y)} {cm(diagramConfClass.getViewport().w)} {cm(diagramConfClass.getViewport().h)}"
       xmlns="http://www.w3.org/2000/svg"
       use:panzoom={onlySvg ? undefined : diagramConfClass}
       use:drawLink={diagramConfClass}
       use:selectElement={onlySvg ? undefined : diagramConfClass}
       use:drag={onlySvg ? undefined : diagramConfClass}
       use:removeSelection={onlySvg ? undefined : diagramConfClass}
       style="touch-action: none;"
       data-proofdiag-app="true"
       data-proofdiag-main-svg={onlySvg ? undefined : "true"}
       role="toolbar"
       tabindex="0" >
    <!-- If the bounding box of the element is too small (e.g. horizontal line will have zero height), add invisible elements around it to increase the size of the bounding box -->
    <filter id="selected" x="-450%" y="-450%" width="1000%" height="1000%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feFlood flood-color="dodgerblue" flood-opacity="1" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    {#each Object.entries(diagramConfClass.getLinks()) as [linkID, link]}
      <Link {...link} id={linkID}  />
    {/each}
    {#if diagramConfClass?.currentlyCreatedLink !== undefined}
      <Link from={diagramConfClass.currentlyCreatedLink.from} to={diagramConfClass.currentlyCreatedLink.to} />
    {/if}
    {#each Object.entries(diagramConfClass.getNodes()) as [id, node]}
      <Node id={id} {...node} />
    {/each}
  </svg>
{/snippet}

{#if onlySvg }
  {@render svg(diagramConfClass.getCurrentDiagram()?.svgSize?.w || "100%", diagramConfClass.getCurrentDiagram()?.svgSize?.h || "100%")}
{:else}

  <div class="relative w-screen h-screen overflow-clip" use:addNodeToDiagram={diagramConfClass} use:pasteFile={diagramConfClass}>
    {@render svg("100%", "100%")}

    <!-- Toolbar -->
    <PanelToolbar
      bind:addPanelCollapsed={addPanelCollapsed}
      bind:downloadPanel={downloadPanel}
      bind:loadFilePanel={loadFilePanel}
      bind:panelDetailsEnabled={panelDetailsEnabled}
      resetViewport={resetViewport}
    />

    <!-- Theory panel -->
    <PanelTheory bind:addPanelCollapsed={addPanelCollapsed} />

    <!-- Theory panel -->
    <PanelDetails bind:panelDetailsEnabled={panelDetailsEnabled} />

    <!-- Proof mode panel -->
    <PanelProofMode bind:panelDetailsEnabled={panelDetailsEnabled} />

    <!-- Errors -->
    <PanelError />

    <!-- Notifications -->
    <PanelNotifications />

    <!-- Load file panel -->
    <PanelLoadFile bind:loadFilePanel={loadFilePanel} />

    <!-- Download panel -->
    <PanelDownload bind:downloadPanel={downloadPanel} />

  </div>
{/if}
