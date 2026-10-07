<script lang="ts">
  let {
    enabled = $bindable(false),
    onchange,
    tiny = false
  }: {
    enabled?: boolean;
    onchange?: (enabled: boolean) => void;
    tiny?: boolean;
  } = $props();

  function toggle() {
    enabled = !enabled;
    if (onchange) {
      onchange(enabled);
    }
  }
</script>

<button
  onclick={toggle}
  class={[
    'relative mx-2 flex inline-block items-center rounded-full border align-middle shadow-lg backdrop-blur-md transition-all duration-300',
    enabled
      ? 'border-green-400 bg-green-200/80 shadow-green-500/30'
      : 'border-gray-300 bg-gray-200/80 shadow-black/10',
    tiny ? 'h-7 w-10' : 'h-10 w-16'
  ]}
>
  <!-- Track highlight -->
  <div
    class="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent"
  ></div>

  <!-- Knob -->
  <div
    class={`absolute top-1/2 left-1 -translate-y-1/2
            rounded-full
            border border-gray-200 bg-white shadow-md
            transition-all duration-300
            ${enabled ? (tiny ? `translate-x-2` : `translate-x-7`) : 'translate-x-0'}
            ${tiny ? 'h-5 w-5' : 'h-7 w-7 '}
            `}
  ></div>
</button>
