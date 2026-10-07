<script lang="ts">
  /** Notification panel */
  import { flip } from 'svelte/animate';
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { getContextDiagram } from '#lib/contexts/context.svelte.js';

  import { capitalizeFirstLetter } from '#lib/utils.js';
  import { stylePanel } from './commonStyles.svelte';
  import Button from '../reusable/Button.svelte';

  let diagramConfClass = getContextDiagram();
</script>

{#if diagramConfClass.notifications.length > 0}
  <div class="absolute bottom-4 left-1/2 flex w-6/10 -translate-x-1/2 flex-col gap-2 p-5">
    {#each diagramConfClass.notifications as notif (notif)}
      <div
        animate:flip={{ duration: 300 }}
        class={[
          stylePanel,
          'm-1 p-4',
          notif.kind == 'error' && '!text-red !border-red-200 !bg-red-100',
          notif.kind == 'info' && '!text-green !border-green-200 !bg-green-100',
          notif.kind == 'warning' && '!text-orange !border-orange-200 !bg-orange-100'
        ]}
      >
        <!-- Floating close icon -->
        <button
          class={[
            'absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center !rounded-full hover:bg-blue-100',
            stylePanel
          ]}
          title="Close download panel"
          onclick={() => diagramConfClass.removeNotification(notif)}
        >
          <Icon icon="material-symbols:close-rounded" width="20" height="20" />
        </button>

        <div class="max-h-[50vh] overflow-y-auto">
          <div>
            {#if notif?.codeFormatted}
              <code
                ><pre style="white-space: pre-wrap;">
{capitalizeFirstLetter(notif.kind)}: {notif.message}
              </pre></code
              >
            {:else}
              {capitalizeFirstLetter(notif.kind)}: {notif.message}
            {/if}
          </div>

          <div>
            {#each notif.buttons as [textButton, f]}
              <Button onclick={f}>{textButton}</Button>
            {/each}
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}
