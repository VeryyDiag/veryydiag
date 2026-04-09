<script>
  let { onclick = null, children, tiny = false, class: className = "", ...rest } = $props();

</script>

<button
  onclick={onclick}
  class={["inline-flex items-center rounded-full backdrop-blur-md border shadow-lg  border-gray-300 shadow-black/10 hover:bg-blue-100/20 active:scale-95 transition", tiny ? "px-2 py-1 mx-1 my-1" : "p-4 mx-2 my-1 h-9", className ]} {...rest}
>
  {@render children?.()}
</button>
