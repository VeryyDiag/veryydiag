<script>
  let { onclick = null, children, tiny = false, class: className = '', ...rest } = $props();
</script>

<button
  {onclick}
  class={[
    'inline-flex items-center rounded-full border border-gray-300 shadow-lg  shadow-black/10 backdrop-blur-md transition hover:bg-blue-100/20 active:scale-95',
    tiny ? 'mx-1 my-1 px-2 py-1' : 'mx-2 my-1 h-9 p-4',
    className
  ]}
  {...rest}
>
  {@render children?.()}
</button>
