<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import SvgEditor from './SvgEditor.svelte';
  import { fn } from 'storybook/test';
  import { expect, within } from 'storybook/test';
  
  const { Story } = defineMeta({
    component: SvgEditor,
    title: 'Components usable by users/SvgEditor',
    parameters: {
      docs: {subtitle: "My subtitle v2"},
    },
    // tags: ['autodocs'],
    /* tags: ['autodocs'],
     * argTypes: {
     *   backgroundColor: { control: 'color' },
     *   size: {
     *     control: { type: 'select' },
     *     options: ['small', 'medium', 'large'],
     *   },
     * },
     * args: {
     *   onclick: fn(),
     * } */
  });
</script>

<!-- This is the **description** of the story -->
<Story name="Primary" args={{
                           diagramConf:{
                             diagramNodes: [
                               {id: "myfirstnode", nodeKind: "myDiscard", pos: {x: 0, y: 0}}
                             ],
                             availableNodes: [
                               {nodeKind: "myDiscard", svgName: "cryptodiagDiscard"}
                             ]
                           }}}
       play={async ({ canvas, userEvent, canvasElement }) => {
            const svg = canvasElement.querySelectorAll("svg");
            await expect(svg).not.toBe(null);
            await expect(canvasElement.querySelectorAll("[data-secudiag-input]").length).toBe(1);
            }}
  />
