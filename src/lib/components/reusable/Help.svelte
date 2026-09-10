<script lang="ts">
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  let { text } : {text: string} = $props()
</script>
<span title={text}>
  <Icon class="inline" icon="mdi:help-circle-outline" width="17" height="17"/>
</span>
