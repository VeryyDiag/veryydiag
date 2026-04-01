<script lang="ts">
  import type { DiagramConfByUser, Error } from "$lib/types/types"
  import Node from "$lib/components/Nodes/Node.svelte"  
  import Link from "$lib/components/Links/Link.svelte"  
  import { setContextDiagram, setContextErrors, type ErrorsMap, registerErrors, DiagramConfClass } from "$lib/contexts/context.svelte";
  import { panzoom, drawLink, selectElement, drag, removeSelection } from "$lib/components/svgEditor/navigateSVG.svelte"
  import { cm, randomID } from "$lib/utils"

  /**
   * Interactive SVG editor component
   */

  interface SvgEditorProps {
    /** My diagramConf config */
    diagramConf: DiagramConfByUser;
    /** Enable some extra information when debugging */
    debug?: boolean;
    /**
       Only prints like a fixed image SVG (can't pan, modify etc) when number is defined.
       The number represents the zoom (set to 1 to print 1 by default).
     */
    onlySvg?: number;
    /** */
  }
  let {
    diagramConf = {},
    debug = false,
    onlySvg = undefined,
  } : SvgEditorProps = $props();

  let diagramConfClass : DiagramConfClass = new DiagramConfClass();
  setContextDiagram(diagramConfClass)
  
  let allErrors : ErrorsMap = $state({})
  setContextErrors(allErrors)

  let errorsImport : Error | undefined = $state(undefined)
  $effect(() => {
    errorsImport = diagramConfClass.setConfig(diagramConf)
  })

  const resetViewport = () => diagramConfClass.fitViewportToContent({scale: onlySvg, breathe: true})
  $effect(() => {diagramConf; resetViewport()})
  
  let uid: string = randomID(); // We use it to register errors per component, this uid is the ID of the current component
  let errors = $derived(errorsImport ? [errorsImport] : [])
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

  
  let addPanelCollapsed = $state(false);

  const styleButton = "p-2 rounded-lg transition active:scale-95 transition"
  const styleButtonEnabled = "bg-blue-50 hover:bg-blue-100 text-blue-600"
  const styleButtonDisabled = "bg-gray-50 hover:bg-gray-100 text-gray-700"
  
</script>

{#snippet svg(width: string | number, height: string | number)}
  <svg bind:this={svgRef} width={width} height={height} viewBox="{cm(diagramConfClass.getViewport().x)} {cm(diagramConfClass.getViewport().y)} {cm(diagramConfClass.getViewport().w)} {cm(diagramConfClass.getViewport().h)}" xmlns="http://www.w3.org/2000/svg" use:panzoom={diagramConfClass} use:drawLink={diagramConfClass} use:selectElement={diagramConfClass} use:drag={diagramConfClass} use:removeSelection={diagramConfClass} style="touch-action: none;"  role="toolbar" tabindex="0" >
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
    {#each Object.entries(diagramConfClass.getConfig()?.links || {}) as [linkID, link]}
      <Link {...link} id={linkID}  />
    {/each}
    {#if diagramConfClass?.currentlyCreatedLink !== undefined}
      <Link from={diagramConfClass.currentlyCreatedLink.from} to={diagramConfClass.currentlyCreatedLink.to} />
    {/if}
    {#each Object.entries(diagramConfClass.getConfig().diagramNodes || {}) as [id, node]}
      <Node id={id} {...node} />
    {/each}
  </svg>
{/snippet}

{#if onlySvg }
  {@render svg(diagramConfClass.getConfig()?.svgSize?.w || "100%", diagramConfClass.getConfig()?.svgSize?.h || "100%")}
{:else}

  <div class="relative w-screen h-screen overflow-clip">
    {@render svg("100%", "100%")}
    
    <!-- Toolbar -->
    <div class="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200">

      <!-- Reframe button -->
      <button id="reframeBtn"
              class="p-2 rounded-lg transition active:scale-95">
        <b>Crypto</b>Diag
      </button>
      
      <!-- Reframe button -->
      <button id="reframeBtn"
              class={[styleButton, styleButtonDisabled]}
              onclick={resetViewport}
        title="Reset view"
        >
        <!-- Icon: fit / reset view -->
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
             fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
        </svg>
      </button>

      <!-- Select tool -->
      <button
        class={[styleButton, styleButtonDisabled]} title="Diagram creation mode" >
        
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
             fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 3l7 14 2-6 6-2L3 3z" />
        </svg>
      </button>

      <!-- Add tool -->
      <button
        class={[
              styleButton,
              addPanelCollapsed && styleButtonDisabled,
              !addPanelCollapsed && styleButtonEnabled
              ]}
        onclick={() => {addPanelCollapsed = !addPanelCollapsed}}
        title="Add node"
        >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
             fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                d="M12 2v20M2 12h20" />
        </svg>
      </button>

    </div>


    <!-- Add panel -->
    <div class={[
               "absolute left-4 top-1/2 -translate-y-1/2 w-xs h-9/10 flex flex-col flex-nowrap gap-2 p-2 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 transition-all duration-300 overflow-y-auto",
               addPanelCollapsed && "opacity-0 invisible",
               ]}>
      <div class="">
        <h1 class="text-center mb-3 text-lg font-normal text-body">Available nodes</h1>
        <p class="text-sm mb-3 text-gray-600">
          Drag and drop a node to add it to your diagram.
        </p>
      </div>
    </div>

    <!-- Error panel -->
    {#if Object.entries(allErrors).length > 0}
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-6/10 flex flex-col gap-2 p-5 backdrop-blur-md rounded-xl shadow-lg border border-red-200 text-red bg-red-100">
        <h1 class="text-center text-lg font-normal text-body">Errors</h1>
        <div>
          <ul class="list-disc px-5">
            {#each Object.entries(allErrors) as [uid, errors]}
              {#each errors as error}
                <li>
                  Error: {error}
                </li>
              {/each}
            {/each}
          </ul>
        </div>    
      </div>
    {/if}    
  </div>
{/if}

