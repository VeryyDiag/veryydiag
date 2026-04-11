<script lang="ts">
  /** Notification panel */
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import Button from '$lib/components/reusable/Button.svelte'
  import { stylePanel } from './commonStyles.svelte';
  import SvgEditor from "./SvgEditor.svelte"
  import { mount } from 'svelte';
  import Toogle from '$lib/components/reusable/Toogle.svelte'
  import { downloadStringAsFile } from "$lib/utils.svelte"
  import { stringify } from 'yaml'
  import {flushSync} from "svelte"

  let { downloadPanel = $bindable() } = $props()
  
  let diagramConfClass = getContextDiagram()

  let copy = $state(false)
  let useYaml = $state(false)
  
  async function downloadSVG({asInView, copy} : {asInView: boolean, copy:boolean}) {
    let svgRef = diagramConfClass.getSVG()
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
        downloadStringAsFile(str, "application/json", "diagram.json.proofdiag")
      }
    } else {
      const str = stringify(diagramConfClass.getDiagramConfUser())
      if (copy) {
        navigator.clipboard.writeText(str)
      } else {        
           downloadStringAsFile(str, "application/x-yaml", "diagram.yaml.proofdiag")
      }
    }
  }

</script>

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
