<script lang="ts">
  import type { DiagramConf, DiagramConfByUser, Error } from "$lib/types/types"
  import Node from "$lib/components/Nodes/Node.svelte"
  import Link from "$lib/components/Links/Link.svelte"
  import { setContextDiagram, setContextErrors, type ErrorsMap, registerErrors, DiagramConfClass } from "$lib/contexts/context.svelte";
  import { warningIfClosingWithUnsavedData, saveToLocalStorage, panzoom, drawLink, selectElement, drag, removeSelection, addNodeToDiagram, pasteFile, selectAll, undo, redo, drawLassoSelection } from "$lib/components/svgEditor/navigateSVG.svelte"
  import { cm, randomID, cmToUnit } from "$lib/utils"
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
  import { onMount, untrack } from "svelte";
  import PanelCreateNodeTemplate from "./PanelCreateNodeTemplate.svelte";
  import PanelPlugins from "./PanelPlugins.svelte";

  /**
   * Interactive SVG editor component
   */

  interface SvgEditorProps {
    /** My diagramConf config */
    diagramConf?: DiagramConfByUser;
    /** Set to replace diagramConf so that you don't need to reparse it (saves time) */
    diagramConfParsed?: DiagramConf | undefined;
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
    diagramConfParsed = undefined,
    debug = false,
    onlySvg = undefined,
  } : SvgEditorProps = $props();

  let diagramConfClass : DiagramConfClass = new DiagramConfClass();
  setContextDiagram(diagramConfClass)

  let uid: string = randomID(); // We use it to register errors per component, this uid is the ID of the current component
  let allErrors = $state<ErrorsMap>({})
  setContextErrors(allErrors)

  let errorsImport = $state<Error | undefined>(undefined)
  $effect(() => {
    try {
      if (diagramConfParsed !== undefined) {
        errorsImport = diagramConfClass.setConfigDontReparse(diagramConfParsed)
      } else {
        errorsImport = diagramConfClass.setConfig(diagramConf)
      }
    } catch (err) {
      errorsImport = {message: `Error while importing the configuration (${err})`}
    }
  })


  const resetViewport = () => diagramConfClass.fitViewportToContent({scale: onlySvg, breathe: onlySvg === undefined})
  $effect(() => {if (diagramConfClass.getCurrentDiagram()?.viewport === undefined) { resetViewport() }})

  let errors = $derived(errorsImport ? [errorsImport.message] : [])
  registerErrors(uid, () => errors)

  let svgRef : SVGGraphicsElement | undefined = undefined
  $effect(() => {
    diagramConfClass.setSvg(svgRef)
  })

  $effect(async () => {
    if (onlySvg !== undefined) {
      // Let them some time before refreshing the viewport, otherwise errors won't show-up
      await (async () => {})();
      resetViewport()
    }
  })

  // For debug
  onMount(() => {
    if (!onlySvg) {
      // @ts-ignore We modify the windows only for debugging
      if (window?.diagramConfClass === undefined) {
        // @ts-ignore We modify the windows only for debugging
        window.diagramConfClass = diagramConfClass
      } else {
        console.warn("A diagram window.diagramConfClass already existed (i.e. you loaded multiple diagrams in the same page). We overwrote it, but beware if you use it to debug!")
        // @ts-ignore We modify the windows only for debugging
        window.diagramConfClass = diagramConfClass
      }
    }
  })

  let proofMode = diagramConfClass.isInProofMode()

  let addPanelCollapsed = $state(false);
  let loadFilePanel = $state(false)
  let downloadPanel = $state(false)
  let panelDetailsEnabled = $state(true)
  let createNodeTemplatePanel = $state(false)
</script>

{#snippet svg(width: string | number, height: string | number)}
  {@const nbErrors = Object.entries(allErrors).length}
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
    use:drawLassoSelection={onlySvg ? undefined : diagramConfClass}
    style="touch-action: none;"
    data-veryydiag-app="true"
    data-veryydiag-main-svg={onlySvg ? undefined : "true"}
    data-veryydiag-uid={uid}
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
    {#if diagramConfClass.getCurrentDiagram()?.error !== undefined && !onlySvg}
      <circle r="10000%" fill="red"/>
    {/if}
    {#each Object.entries(diagramConfClass.getLinks()) as [linkID, link] (linkID)}
      <Link {...link} id={linkID}  />
    {/each}
    {#if diagramConfClass?.currentlyCreatedLink !== undefined}
      <Link from={diagramConfClass.currentlyCreatedLink.from} to={diagramConfClass.currentlyCreatedLink.to} />
    {/if}
    {#each Object.entries(diagramConfClass.getNodes()) as [id, node] (id)}
      <Node id={id} {...node} />
    {/each}
    {#if !onlySvg && diagramConfClass.currentlyDrawnLassoSelection !== undefined && diagramConfClass.currentlyDrawnLassoSelection.length > 0}
      <path data-veryydiag-lasso="true" d={`M${diagramConfClass.currentlyDrawnLassoSelection.map(({x, y}) => `${x} ${y}`).join(" L")}Z`} fill-rule="evenodd" fill="dodgerblue" fill-opacity="0.1" stroke="grey" stroke-dasharray="4" stroke-width="0.8" />
        <!-- It is very hard to draw links with touch devices (and sometimes with the mouse as well)
             since we need to click exactly on the small anchor with a big finger. Hence, we provide
             another way to create links: if we end our lasso where we started on the circle, it
             creates a link between the two selected anchors when available.
        -->
        <circle
          cx={diagramConfClass.currentlyDrawnLassoSelection[0].x}
          cy={diagramConfClass.currentlyDrawnLassoSelection[0].y}
          r="5"
          fill="grey"
          stroke="dodgerblue"
          data-veryydiag-lasso-create-link="true"
        />
        <!-- To select nodes we show the center of the node that must be selected -->
        {#each Object.entries(diagramConfClass.getNodes()) as [id, node] (id)}
          {#if node?.pos !== undefined}
            <circle cx={cmToUnit(node.pos.x)} cy={cmToUnit(node.pos.y)} r="2" stroke="white" />
          {/if}
        {/each}
    {/if}
    {#if onlySvg !== undefined && nbErrors > 0}
      <text x="0" y="0" style="fill:red; font: bold 15px sans-serif;">
        <title>
          {#each Object.entries(allErrors) as [uid, errors]}
            {#each errors as error}
              - Error: {error}
            {/each}
          {/each}
        </title>
        {nbErrors} ERROR(s) (hover me)
      </text>
    {/if}
  </svg>
{/snippet}

{#if onlySvg }
  {@render svg(diagramConfClass.getCurrentDiagram()?.svgSize?.w || "100%", diagramConfClass.getCurrentDiagram()?.svgSize?.h || "100%")}
{:else}

  <div class="relative w-screen h-screen overflow-clip"
    tabindex="0" role="button"
    use:addNodeToDiagram={diagramConfClass}
    use:pasteFile={diagramConfClass}
    use:saveToLocalStorage={onlySvg ? undefined : diagramConfClass}
    use:selectAll={onlySvg ? undefined : diagramConfClass}
    use:undo={onlySvg ? undefined : diagramConfClass}
    use:redo={onlySvg ? undefined : diagramConfClass}
    use:warningIfClosingWithUnsavedData={onlySvg ? undefined : diagramConfClass}
  >
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
    <PanelTheory bind:addPanelCollapsed={addPanelCollapsed} bind:createNodeTemplatePanel={createNodeTemplatePanel} />

    <!-- Theory panel -->
    <PanelDetails bind:panelDetailsEnabled={panelDetailsEnabled} />

    <!-- Proof mode panel -->
    <PanelProofMode bind:panelDetailsEnabled={panelDetailsEnabled} />

    <!-- Errors -->
    <PanelPlugins />

    <!-- Errors -->
    <PanelError />

    <!-- Notifications -->
    <PanelNotifications />

    <!-- Load file panel -->
    <PanelLoadFile bind:loadFilePanel={loadFilePanel} />

    <!-- Download panel -->
    <PanelDownload bind:downloadPanel={downloadPanel} />

    <!-- Download panel -->
    <PanelCreateNodeTemplate bind:createNodeTemplatePanel={createNodeTemplatePanel} />

  </div>
{/if}
