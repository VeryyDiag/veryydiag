<!-- Portal.svelte -->
<script lang="ts">
  let {  wrapper = $bindable(), isOpen, isDialog, children } = $props();
  let ref : HTMLElement
  function portal(node: HTMLElement) {
    const elt = document.getElementById("myportal")
    if (elt) {
      elt.appendChild(node);
    } else {
      console.error("Portal: no div with ID 'myportal' to use")
    }
    return {
      destroy() {
        node.remove();
      }
    };
  }
  $effect(() => {
    if(isOpen) {
      console.log("running effect")
      const bb = ref?.getBoundingClientRect();
      const bbDialog = wrapper?.getBoundingClientRect();
      console.log(ref, "BB", bb)
      if (bb) {
        const elt = document.getElementById("myportal")
        if(elt) {
          elt.style.top = `${Math.min(window.innerHeight-bbDialog.height,Math.max(0,bb.top-bbDialog.height/2))}px`
          elt.style.left = `${bb.left}px`
          console.log("changed", elt.style.top, "innerHeight", window.innerHeight, window.innerHeight-bbDialog.height/2)
        } else {
          console.log("No ref node")
        }
      }
    }
  })
</script>
<!-- Useful to know the position to print the portal at the right position -->
<span bind:this={ref}></span>
<div use:portal bind:this={wrapper}>
  {#if isOpen}
    <div class="bg-white rounded-xl p-2 border-1 border-gray-200">
      {@render children?.()}
    </div>
  {/if}
</div>
