<script lang="ts">
  import { flip } from 'svelte/animate';
  import type { DiagramConfByUser, Error } from "$lib/types/types"
  import {flushSync} from "svelte"
  import Node from "$lib/components/Nodes/Node.svelte"  
  import Link from "$lib/components/Links/Link.svelte"  
  import { setContextDiagram, setContextErrors, type ErrorsMap, registerErrors, DiagramConfClass } from "$lib/contexts/context.svelte";
  import { panzoom, drawLink, selectElement, drag, removeSelection, addNodeToDiagram, pasteFile } from "$lib/components/svgEditor/navigateSVG.svelte"
  import { cm, randomID, downloadStringAsFile, capitalizeFirstLetter } from "$lib/utils"
  import AvailableNode from "./AvailableNode.svelte";
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { parse, stringify } from 'yaml'
  import Toogle from '$lib/components/reusable/Toogle.svelte'
  import Button from '$lib/components/reusable/Button.svelte'
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

  
  let addPanelCollapsed = $state(false);

  let loadFilePanel = $state(false)
  let downloadPanel = $state(false)

  const stylePanel = " bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 transition-all duration-300"
  const styleButton = "p-2 rounded-lg transition active:scale-95 transition"
  const styleButtonEnabled = "bg-blue-50 hover:bg-blue-100 text-blue-600"
  const styleButtonDisabled = "bg-gray-50 hover:bg-gray-100 text-gray-700"
  const dividerStyle = "w-px h-10 bg-gray-300 mx-1"

  let copy = $state(false)
  let useYaml = $state(false)
  
  // Great, we can recursively import ourself!
  import SvgEditor from "./SvgEditor.svelte"
  import { mount } from 'svelte';
	import { getConfig } from 'storybook/test';
  async function downloadSVG({asInView, copy} : {asInView: boolean, copy:boolean}) {
    let str = ""
    if (asInView) {
      if (svgRef === undefined) {
        alert("Error: no SVG found. This should never occur, please report a bug.")
      } else {
        str = svgRef.outerHTML
      }
    } else {
      const container = document.createElement('div')
      // We must mount the container or it will not work,
      // container.hidden = true won't work,
      // visibility: hidden seems to work, but anyway too fast to see anything
      container.style = "visibility: hidden"
      // Needed or some variables would not update, not sure why
      document.body.appendChild(container);
      const foo = mount(SvgEditor, {
        target: container,
        props: {
          onlySvg: 1,
          diagramConf: diagramConfClass.getDiagramConfUser()
      }})
      flushSync(); // Make sure that effects are ran, not sure if it makes a difference when mounted in the dom?
      // Wait for the javascript code that creates the svg file to mount
      await new Promise(r => setTimeout(r, 0));
      str = container.innerHTML
      container.remove()
    }
    if (copy) {
      navigator.clipboard.writeText(str)
    }
    else {
      downloadStringAsFile(str, "image/svg+xml", "diagram.svg")
    }
  }

  function downloadDiagram({json, copy}: {json: boolean, copy: boolean}) {
    if (json) {
      const str = JSON.stringify(diagramConfClass.getDiagramConfUser())
      if (copy) {
        navigator.clipboard.writeText(str)
      }
      else {
        downloadStringAsFile(str, "application/json", "diagram.json.diagproof")
      }
    } else {
      const str = stringify(diagramConfClass.getDiagramConfUser())
      if (copy) {
        navigator.clipboard.writeText(str)
      }
      else {        
    downloadStringAsFile(str, "application/x-yaml", "diagram.yaml.diagproof")
           }
    }
  }
 
  let isDragging = $state(false)
  async function handleFile(file: File) {
    try {
      const content = await file.text();
      diagramConfClass.setConfig(parse(content));
      diagramConfClass.sendNotification("info", "The file was loaded with success.");
      loadFilePanel = false;
    } catch (error) {
      diagramConfClass.sendNotification("error", `Error while loading the file (${error}).`);
    }
  }
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
       data-diagproof-main-svg={onlySvg ? undefined : "true"}
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
    <div class={["absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center"]}>

      <!-- Tabs -->
      <div class="flex gap-0 p-0 rounded-t-xl bg-white/80 backdrop-blur-md border border-b-0 border-gray-200 shadow-lg overflow-hidden">
        <button class="tab px-2 py-1 border-r border-gray-100 hover:bg-blue-100/30 " title="Remove current diagram" onclick={() => diagramConfClass.removeDiagram()}>
          <Icon icon="mdi:minus" width="20" height="20"/>
        </button>
        {#each diagramConfClass.getConfig()?.diagramTabs as diagramID}
          {@const currentTab = diagramID === diagramConfClass.getConfig().currentDiagramTab}
          <span contenteditable={currentTab} role="button" tabindex="0"
                class={[
                      "hover:bg-gray-100/30 px-2 py-1 border-r border-gray-100 hover:bg-blue-100/10",
                      currentTab && "bg-blue-100/70"
                      ]}
                onclick={() => {if (!currentTab) {diagramConfClass.changeDiagramTab(diagramID)}}}
                onblur={(e) => {if (currentTab) {console.log("blur");diagramConfClass.getConfig().diagrams[diagramID].diagramName = (e.target as HTMLElement).innerText}}}
                onkeydown={(e) => {if (e.key === 'Enter') {(e.target as HTMLElement).blur()}}}
            >
            {diagramConfClass.getConfig()?.diagrams[diagramID]?.diagramName || "No name"}
          </span>
        {/each}
        <button class="tab px-2 py-1 border-r border-gray-100 hover:bg-blue-100/30 " title="Add new diagram" onclick={() => diagramConfClass.addDiagram()}>
          <Icon icon="mdi:plus" width="20" height="20"/>
        </button>
      </div>

      
      <div class={["flex gap-2 p-2 rounded-t-xl", stylePanel]}>
        <button id="reframeBtn"
                class="p-2 rounded-lg transition active:scale-95">
          <b>Diag</b>Proof
        </button>
        
        <!-- Creation mode -->
        <button
          class={[styleButton, styleButtonEnabled]} title="Diagram creation mode" >
          
          <Icon icon="fluent-mdl2:edit-create" width="25" height="25" />
        </button>

        <!-- Proof mode -->
        <button
          class={[styleButton, styleButtonDisabled]} title="Proof mode" >
          
          <Icon icon="streamline:triangle-arrow-roadmap-remix" color="black" width="25" height="25" />
        </button>


        <!-- ========== Divider for generic tools ========== -->
        <div class={dividerStyle}></div>
        <!-- <div class="h-10 border-l border-dashed border-gray-300 mx-1"></div> -->
        <!-- <div class="w-px h-5 bg-gradient-to-b from-transparent via-gray-500 to-transparent mx-1"></div> -->

        
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

        <!-- Load button -->
        <button id="reframeBtn"
                title="Load diagram proof"
                class={[styleButton, downloadPanel ? styleButtonEnabled : styleButtonDisabled]}
                onclick={() => loadFilePanel = !loadFilePanel}
          >
          <Icon icon="material-symbols:file-open-outline" width="25" height="25"/>
        </button>

        
        <!-- Download button -->
        <button id="reframeBtn"
                title="Download diagram/proof or download SVG"
                class={[styleButton, downloadPanel ? styleButtonEnabled : styleButtonDisabled]}
                onclick={() => downloadPanel = !downloadPanel}
          >
          <!-- Icon: fit / reset view -->
          <Icon icon="material-symbols:sim-card-download-outline" width="25" height="25"/>
        </button>
        
        <!-- ========== Divider for mode-specific tools ========== -->
        <div class={dividerStyle}></div>
        
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
          <Icon icon="mdi:plus" width="25" height="25"/>
        </button>

        <!-- Remove tool -->
        <button
          class={[
                styleButton, styleButtonDisabled
                ]}
          onclick={() => {diagramConfClass.removeSelection()}}
          title="Delete selection (click to select)"
          >
          <Icon icon="mdi:trash-outline" width="25" height="25" />
        </button>
      </div>

    </div>


    <!-- Add panel -->
    <div class={[
               "absolute left-4 top-1/2 -translate-y-1/2 w-xs h-9/10 flex flex-col flex-nowrap gap-2 p-2 bg-white/80  overflow-x-auto overflow-y-auto",
               stylePanel,
               addPanelCollapsed && "opacity-0 invisible",
               ]}>
      <div class="">
        <h1 class="text-center mb-3 text-lg font-normal text-body">Available nodes</h1>
        <p class="text-sm mb-3 text-gray-600">
          Drag and drop a node to add it to your diagram.
        </p>
        <ul class="list-disc">
          {#each Object.entries(diagramConfClass.getCurrentTheory()?.availableNodes || {}) as [nodeKind, node]}
            <li><AvailableNode nodeKind={nodeKind} node={node} /></li>
          {/each}
        </ul>
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

    <!-- Notifications -->
    {#if diagramConfClass.notifications.length > 0}
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-6/10 flex flex-col gap-2 p-5">
        {#each diagramConfClass.notifications as notif (notif)}
          <div animate:flip={{ duration: 300 }} class={[
                                                      stylePanel,
                                                      "p-4 m-1",
                                                      (notif.kind == "error") && "!border-red-200 !text-red !bg-red-100",
                                                      (notif.kind == "info") && "!border-green-200 !text-green !bg-green-100",
                                                      (notif.kind == "warning") && "!border-orange-200 !text-orange !bg-orange-100",
                                                      ]}>
            <!-- Floating close icon -->
            <button
              class={["absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center !rounded-full hover:bg-blue-100", stylePanel]}
              aria-label="Close download panel"
              onclick={() => diagramConfClass.removeNotification(notif)}
              >
              <Icon icon="material-symbols:close-rounded" width="20" height="20" />          
            </button>

            {capitalizeFirstLetter(notif.kind)}: {notif.message}
          </div>
        {/each}
      </div>
    {/if} 

    <!-- Load file panel -->
    {#if loadFilePanel }
      <div class={["absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-4/10 h-7/10 flex flex-col items-center gap-2 p-7 overflow-x-auto overflow-y-auto", stylePanel]}>
        <!-- Floating close icon -->
        <button
          class={["absolute top-2 right-2 w-8 h-8 flex items-center justify-center !rounded-full hover:bg-blue-100", stylePanel]}
          aria-label="Close load file panel"
          onclick={() => loadFilePanel = false}
        >
          <Icon icon="material-symbols:close-rounded" width="20" height="20" />          
        </button>
        <h1 class="text-center text-lg font-normal text-body">Download</h1>
        <div class={`w-full h-70 ${isDragging ? 'bg-blue-100 border-blue-400' : 'bg-gray-100'} rounded-xl  p-1 flex items-center justify-center text-center border-dashed border`}
             role="region"
             aria-label="File upload dropzone"
             ondragenter={() => isDragging = true}
             ondragover={(e) => e.preventDefault()}
             ondragleave={(e) => {
                         if (e.currentTarget === e.target) {
                           isDragging = false;
                         }}}
             ondrop={async (e) => {
                    e.preventDefault();
                    isDragging = false;

                    const files = e.dataTransfer?.files;
                    if (files?.length) {
                      handleFile(files[0]);
                    }}}
          >
          <div>
            <p class="mb-2">
              Drag and drop your file here, paste them anywhere at any time, or browse to find it!
            </p>
            <p>
              <Button>
                <input
                  type="file"
                  accept=".diagproof,.yml,.yaml,.json"
                  onchange={async (e) => {
                           const files = (e.target as HTMLInputElement).files;
                           if (files?.length) {
                             handleFile(files[0]);
                           }}}
                />
              </Button>
            </p>
          </div>
        </div>
      </div>
    {/if}    

    <!-- Download panel -->
    {#if downloadPanel }
      <div class={["absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-4/10 h-7/10 flex flex-col items-center gap-2 p-5 overflow-x-auto overflow-y-auto", stylePanel]}>
        <!-- Floating close icon -->
        <button
          class={["absolute top-2 right-2 w-8 h-8 flex items-center justify-center !rounded-full hover:bg-blue-100", stylePanel]}
          aria-label="Close download panel"
          onclick={() => downloadPanel = false}
        >
          <Icon icon="material-symbols:close-rounded" width="20" height="20" />          
        </button>
        <h1 class="text-center text-lg font-normal text-body">Download</h1>
        <p class="text-center">Copy instead of download: <Toogle bind:enabled={copy} /> Use yaml: <Toogle bind:enabled={useYaml} /></p>
        <Button onclick={() => downloadSVG({asInView: true, copy: copy})}>{copy ? "Copy" : "Download"} SVG like in view</Button>
        <Button onclick={() => downloadSVG({asInView: false, copy: copy})}>{copy ? "Copy" : "Download"} whole SVG</Button>
        <Button onclick={() => downloadDiagram({json: !useYaml, copy: copy})}>{copy ? "Copy" : "Download"} diagram file ({useYaml ? "yaml variant, recommended if plan to manually edit" : "json variant, recommended if no plan to manually edit"})</Button>
      </div>
    {/if}    

  </div>
{/if}

