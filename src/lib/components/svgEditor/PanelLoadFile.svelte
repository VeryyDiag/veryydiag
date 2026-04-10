<script lang="ts">
  /** Notification panel */
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import Button from '$lib/components/reusable/Button.svelte'
  import { parse } from 'yaml'
  import { stylePanel } from './commonStyles.svelte';

  let diagramConfClass = getContextDiagram()

  let { loadFilePanel = $bindable() } = $props()

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
              accept=".proofdiag,.yml,.yaml,.json"
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
