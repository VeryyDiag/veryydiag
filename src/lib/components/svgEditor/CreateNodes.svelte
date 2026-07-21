<script lang="ts">
  /** "Create Node" section of the menu add section */
  import Button from '$lib/components/reusable/Button.svelte'
  import SvgEditor from './SvgEditor.svelte';
  import { allDefaultSvgNames } from "$lib/components/Nodes/allNodes"
  let { createNodeTemplatePanel = $bindable() } = $props()

  import { parse } from 'yaml'

  import { getContextDiagram } from "$lib/contexts/context.svelte";
	import { styleTitleInTheoryPanel } from './commonStyles.svelte';
  let diagramConfClass = getContextDiagram()


  let isDraggingSVG = $state(false)
  async function handleSVGFiles(files: FileList) {
    Array.from(files).forEach(async (file) => {
      try {
        const name = file.name.replace(/.svg$/, "")
        const content = await file.text();
        diagramConfClass.addSVGNodeToTheory(name, {svgString: parse(content)});
      } catch (error) {
        diagramConfClass.sendNotification("error", `Error while loading the file ${file?.name} (${error}).`);
      }
    })
  }

</script>

<h1 class={styleTitleInTheoryPanel}>Create node</h1>
<div class="text-sm mb-3 text-gray-600 min-w-0">
  <p class="mb-2">Either create nodes via:</p>
  <p class="mb-2"><Button onclick={() => createNodeTemplatePanel = true}>Create node from templates</Button></p>
  <p class="mb-2">… or create nodes from a pre-existing list of SVG (click on them to create a new node with this style)…</p>
  <!-- overscroll-x-contain is needed to prevent gesture navigation to change the page when
       scrolling horizontally -->
  <div class="min-w-0 overflow-x-auto overscroll-x-contain mb-2 p-2 pb-4">
    <div class="flex flex-nowrap w-max gap-2">
      {#each allDefaultSvgNames as svgName}
        <div class="m-1 p-2 border border-dashed" role="button" tabindex="0" onkeydown={(e) => {if (e.key === 'Enter') {(e.target as HTMLElement).blur()}}} onclick={() => {diagramConfClass.undoSnapshot(); diagramConfClass.addSVGNodeToTheory(svgName, {svgName})}}>
          <SvgEditor onlySvg={1.3}
            diagramConfParsed={{
                          diagrams: {
                            main: {
                              nodes: {
                                myfirstnode: {nodeKind: svgName, pos: {x: 0, y: 0}},
                              },
                            }
                          },
                          theories: {
                            main: {
                              availableNodes: {
                                [svgName]: {
                                  svgName: svgName
                                },
                              }
                            }
                          },
                          proofs: {},
                          tabs: [{ tabKind: "tabDiagram", diagramID: "main" }],
                          currentTab: { tabKind: "tabDiagram", diagramID: "main" },
                        }}
          />
        </div>
      {/each}
    </div>
  </div>
</div>
<div class={`text-sm mb-3 text-gray-600 w-full min-h-30 ${isDraggingSVG ? 'bg-blue-100 border-blue-400' : 'bg-gray-100'} rounded-xl  p-1 flex items-center justify-center text-center border-dashed border flex flex-col`}
  role="region"
  data-veryydiag-dropzone="true"
  aria-label="File upload dropzone"
  ondragenter={() => isDraggingSVG = true}
  ondragover={(e) => e.preventDefault()}
  ondragleave={(e) => {
                if (!(e?.target as HTMLElement)?.dataset?.veryydiagDropzone && !(e?.target as HTMLElement)?.closest("data-veryydiag-dropzone")) {
                  isDraggingSVG = false;
                }}}
  ondrop={async (e) => {
           e.preventDefault();
           isDraggingSVG = false;

         const files = e.dataTransfer?.files;
         if (files?.length) {
           handleSVGFiles(files);
         }}}
  >
  <p class="mb-2">
    … or load, paste, or drag and drop your own SVG file to add a new node to your theory.<br>
    (cf documentation for annotation details).
  </p>
  <p>
    <Button>
      <input
        type="file"
        accept=".svg"
        onchange={async (e) => {
                 const files = (e.target as HTMLInputElement).files;
                 if (files?.length) {
                   handleSVGFiles(files);
                 }}}
      />
    </Button>
  </p>
</div>
