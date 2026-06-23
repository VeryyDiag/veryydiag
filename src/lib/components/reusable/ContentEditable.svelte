<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    onedit = (s: string) => {},
    children,
    ...rest
  } = $props<{
    onedit?: (s: string) => void;
    children?: Snippet;
    [key: string]: any;
  }>();

</script>

<span
  contenteditable="true" role="button" tabindex="0" onblur={(e) => onedit((e.target as HTMLElement).innerText)}
  onkeydown={(e) => {if (e.key === 'Enter') {(e.target as HTMLElement).blur()}}}
  {...rest}
>
  {@render children?.()}
</span>
