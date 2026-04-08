<script>
  let { onclick = null, children } = $props();

</script>

<button
  onclick={onclick}
  class={"p-4 mx-2 my-1 h-9 flex items-center rounded-full backdrop-blur-md border shadow-lg  border-gray-300 shadow-black/10 hover:bg-blue-100/20 active:scale-95 transition"}
>
  {@render children?.()}
</button>
