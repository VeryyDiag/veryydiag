<script lang="ts">
  import { onMount } from 'svelte';
  import { getContextDiagram } from '#lib/contexts/context.svelte.js';
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/

  import {
    stylePanel,
    styleButton,
    styleButtonEnabled,
    styleButtonDisabled,
    dividerStyle,
    styleSelected,
    styleInput
  } from './commonStyles.svelte';
  import PanelPluginsPlugin from './PanelPluginsPlugin.svelte';
  import { entries } from '#lib/utils.js';
  import Button from '../reusable/Button.svelte';
  import { getConfig } from 'storybook/test';

  let diagramConfClass = getContextDiagram();
  let createPluginWindow = $state(false);

  let newPluginName = $state('');
  let newPluginMethod: 'url' | 'builtins' | 'code' | 'file' = $state('builtins');
  let newPluginURL = $state('');
  let newPluginCode = $state('');

  const builtinsPlugins = [{ name: 'ZX-calculus', url: 'plugins/zx-calculus', description: '' }];

  let isDraggingPluginFile = $state(false);
  async function handlePluginFile(files: FileList) {
    Array.from(files).forEach(async (file) => {
      try {
        const name = file.name.replace(/.html$/, '').replace(/_/g, ' ');
        const content = await file.text();
        newPluginName = name;
        newPluginCode = content;
      } catch (error) {
        diagramConfClass.sendNotification(
          'error',
          `Error while loading the file ${file?.name} (${error}).`
        );
      }
    });
  }

  // Plugin with a visible window
  let visiblePlugin: number | undefined = $state(undefined);

  function addPlugin() {
    if (newPluginName === '') {
      diagramConfClass.sendNotification('error', `Enter a non-empty plugin name.`);
      return;
    }
    if (['url', 'builtins'].includes(newPluginMethod) && newPluginURL === '') {
      diagramConfClass.sendNotification(
        'error',
        `Enter a non-empty URL, file or code to create a new plugin.`
      );
      return;
    } else if (!['url', 'builtins'].includes(newPluginMethod) && newPluginCode === '') {
      diagramConfClass.sendNotification(
        'error',
        `Enter a non-empty URL, file or code to create a new plugin.`
      );
      return;
    }
    diagramConfClass.undoSnapshot();
    diagramConfClass.addPlugin({
      ...(!['url', 'builtins'].includes(newPluginMethod) || newPluginURL === ''
        ? {}
        : { url: newPluginURL }),
      ...(['url', 'builtins'].includes(newPluginMethod) || newPluginCode === ''
        ? {}
        : { code: newPluginCode }),
      name: newPluginName
    });
    newPluginName = '';
    newPluginMethod = 'file';
    newPluginURL = '';
    newPluginCode = '';
    createPluginWindow = false;
  }
</script>

{#each diagramConfClass.getConfig()?.plugins || [] as plugin, i (plugin.name)}
  <PanelPluginsPlugin
    visible={visiblePlugin === i}
    close={() => (visiblePlugin = undefined)}
    deletePlugin={() => diagramConfClass.getConfig()?.plugins?.splice(i, 1)}
    {...plugin}
  />
{/each}

<!-- Panel to create plugins -->
{#if createPluginWindow}
  <div
    class={[
      'absolute top-1/2 left-1/2 flex h-7/10 w-4/10 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 overflow-x-auto overflow-y-auto p-7',
      stylePanel
    ]}
  >
    <!-- Floating close icon -->
    <button
      class={[
        'absolute top-2 right-2 flex h-8 w-8 items-center justify-center !rounded-full hover:bg-blue-100',
        stylePanel
      ]}
      title="Close plugin window"
      onclick={() => (createPluginWindow = false)}
    >
      <Icon icon="material-symbols:close-rounded" width="20" height="20" />
    </button>
    <h1 class="text-body text-center text-lg font-normal">Add plugin</h1>
    <p>Choose the method to add a new plugin:</p>
    <p>
      <select class={styleInput} bind:value={newPluginMethod}>
        <option value="builtins">Builtins plugins</option>
        <option value="file">By uploading its HTML file</option>
        <option value="url">Via its URL</option>
        <option value="code">By writting its HTML code</option>
      </select>
    </p>
    {#if newPluginMethod === 'builtins'}
      <p>You can choose below from a list of plugins embeded into VeryyDiag:</p>
      <ul class="list-disc">
        {#each builtinsPlugins as plugin}
          <li>
            {plugin.name}
            <Button tiny={true} title={`Add the ${plugin.name} plugin`}
              ><Icon
                icon="mdi:plus"
                width="15"
                height="15"
                onclick={() => {
                  newPluginName = plugin.name;
                  newPluginURL = plugin.url;
                  addPlugin();
                }}
              /></Button
            >
          </li>
        {/each}
      </ul>
    {:else}
      <p>Name: <input class={`${styleInput} w-30`} bind:value={newPluginName} /></p>
    {/if}
    {#if newPluginMethod === 'url'}
      <p>
        URL: <input
          class={`${styleInput} w-30`}
          bind:value={newPluginURL}
          onblur={(e) => {
            newPluginName =
              (e.currentTarget as HTMLInputElement).value
                .replace(/\/$/, '')
                .split('/')
                .pop()
                ?.replace(/\..*$/, '') || newPluginName;
          }}
        />
      </p>
    {/if}
    {#if newPluginMethod === 'code'}
      <p>Code:</p>
      <textarea class={`${styleInput} h-100 w-full`} bind:value={newPluginCode}></textarea>
    {/if}
    {#if newPluginMethod === 'file'}
      <div
        class={`mb-3 min-h-30 w-full text-sm text-gray-600 ${isDraggingPluginFile ? 'border-blue-400 bg-blue-100' : 'bg-gray-100'} flex  flex flex-col items-center justify-center rounded-xl border border-dashed p-1 text-center`}
        role="region"
        data-veryydiag-dropzone="true"
        aria-label="File upload dropzone"
        ondragenter={() => (isDraggingPluginFile = true)}
        ondragover={(e) => e.preventDefault()}
        ondragleave={(e) => {
          if (
            !(e?.target as HTMLElement)?.dataset?.veryydiagDropzone &&
            !(e?.target as HTMLElement)?.closest('data-veryydiag-dropzone')
          ) {
            isDraggingPluginFile = false;
          }
        }}
        ondrop={async (e) => {
          e.preventDefault();
          isDraggingPluginFile = false;

          const files = e.dataTransfer?.files;
          if (files?.length) {
            handlePluginFile(files);
          }
        }}
      >
        <p class="mb-2">
          … or load, paste, or drag and drop your own SVG file to add a new node to your theory.<br
          />
          (cf documentation for annotation details).
        </p>
        <p>
          <Button>
            <input
              type="file"
              accept=".html"
              onchange={async (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files?.length) {
                  handlePluginFile(files);
                }
              }}
            />
          </Button>
        </p>
      </div>
    {/if}
    {#if newPluginMethod !== 'builtins'}
      <Button onclick={addPlugin}
        ><Icon icon="mdi:plus" width="25" height="25" class="inline" /> Add plugin</Button
      >
    {/if}
  </div>
{/if}

<div class={['absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2']}>
  {#each diagramConfClass?.getConfig()?.plugins || [] as plugin, i}
    <button
      class={['rounded-t-xl p-2', stylePanel, i === visiblePlugin ? styleSelected : '']}
      onclick={() => (visiblePlugin = i)}
    >
      {plugin.name}
    </button>
  {/each}

  <button class={['rounded-t-xl p-2', stylePanel]} onclick={() => (createPluginWindow = true)}>
    <Icon icon="mdi:plus" width="25" height="25" class="inline" /> Plugin
  </button>
</div>
