<script lang="ts">
  let {
    enabled = $bindable(false),
    onchange,
    tiny = false,
  } : {
    enabled?: boolean,
    onchange?: (enabled: boolean) => void,
    tiny?: boolean,
  } = $props();

  function toggle() {
    enabled = !enabled;
    if (onchange) {
      onchange(enabled)
    }
  }
</script>

<button
  onclick={toggle}
  class={["inline-block align-middle mx-2 relative w-16 h-9 flex items-center rounded-full transition-all duration-300 backdrop-blur-md border shadow-lg",
        enabled
        ? 'bg-green-200/80 border-green-400 shadow-green-500/30'
        : 'bg-gray-200/80 border-gray-300 shadow-black/10',
        ]}
>
  <!-- Track highlight -->
  <div class="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>

  <!-- Knob -->
  <div
    class={`absolute left-1 top-1/2 -translate-y-1/2
          w-7 h-7 rounded-full
          bg-white border border-gray-200 shadow-md
          transition-all duration-300
          ${enabled ? 'translate-x-7' : 'translate-x-0'}
          `}
  ></div>
</button>
