<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    /** You may not need htmlElt and e, except when you want to change the state to its old value if it changes etc */
    onedit = (s: string, htmlElt: HTMLElement, e: Event) => {},
    children,
    ...rest
  } = $props<{
    onedit?: (s: string, t: HTMLElement, e: Event) => void;
    children?: Snippet;
    [key: string]: any;
  }>();
</script>

<span
  contenteditable="true"
  spellcheck="false"
  role="button"
  tabindex="0"
  onblur={(e) => onedit((e.target as HTMLElement).innerText, e.target as HTMLElement, e)}
  onkeydown={(e) => {
    if (e.key === 'Enter') {
      (e.target as HTMLElement).blur();
    }
  }}
  {...rest}
>
  {@render children?.()}
</span>
