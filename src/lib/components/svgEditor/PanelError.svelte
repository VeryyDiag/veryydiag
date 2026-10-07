<script lang="ts">
  /** Error panel */
  import { getContextErrors } from '#lib/contexts/context.svelte.js';

  let allErrors = getContextErrors();
</script>

<!-- Error panel -->
{#if Object.entries(allErrors).length > 0}
  <div
    class="text-red absolute bottom-4 left-1/2 flex max-h-2/10 w-6/10 -translate-x-1/2 flex-col gap-2 overflow-auto rounded-xl border border-red-200 bg-red-100 p-5 shadow-lg backdrop-blur-md"
  >
    <h1 class="text-body text-center text-lg font-normal">Errors</h1>
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
