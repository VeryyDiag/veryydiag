<script lang="ts">
  import Icon from "@iconify/svelte";
  import { slide } from "svelte/transition";

  let { text="Details" , children, class: className = "", collapsed = $bindable(true), more="[...]", ...rest } = $props();
</script>

<div
  class={[``, className ]} {...rest}
>
  <button onclick={() => collapsed = !collapsed}>
    <span class={`inline-block duration-100 transition-transform ${collapsed ? '' : 'rotate-90'}`}>
      <Icon style="display: inline; vertical-align: -0.325em" icon="mdi:chevron-right" width="20" height="20" />
    </span>
  </button>{text}
  {#if more !== "" && collapsed}
    <button transition:slide={{ duration: 300 }} class="text-blue-300" onclick={() => collapsed = !collapsed}>{more}</button>
  {/if}
  {#if !collapsed}
    <div transition:slide={{ duration: 300 }} >
      {@render children?.()}
    </div>
  {/if}
</div>
