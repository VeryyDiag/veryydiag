<script lang="ts">
  /** Error panel */
  import { getContextErrors } from "$lib/contexts/context.svelte";

  let allErrors = getContextErrors()
</script>

<!-- Error panel -->
{#if Object.entries(allErrors).length > 0}
  <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-6/10 flex flex-col gap-2 p-5 backdrop-blur-md rounded-xl shadow-lg border border-red-200 text-red bg-red-100 max-h-2/10 overflow-auto">
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
