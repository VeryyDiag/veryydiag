// We use CSF because anyway most of it is javascript anyway so the svelte format does not help much, and it also
// has a much better editor experienc since emacs does not (yet) deal with inlined javascript with svelte:
// https://github.com/fxbois/web-mode/issues/1336
import type { Meta, StoryObj } from '@storybook/sveltekit';
import { expect } from 'storybook/test';

import SvgEditor from './SvgEditor.svelte';

const meta = {
  component: SvgEditor,
  title: 'Components usable by users/SvgEditor',
  parameters: {
    docs: {subtitle: "My subtitle v2"},
  },
  // tags: ['autodocs'],
  // argTypes: {} // TODO
} satisfies Meta<typeof SvgEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    diagramConf:{
      diagramNodes: [
        {id: "myfirstnode", nodeKind: "myDiscard", pos: {x: 0, y: 0}}
      ],
      availableNodes: [
        {nodeKind: "myDiscard", svgName: "cryptodiagDiscard"}
      ]
  }},
  play: async ({ canvas, userEvent, canvasElement }) => {
    const svg = canvasElement.querySelectorAll("svg");
    await expect(svg).not.toBe(null);
    await expect(canvasElement.querySelectorAll("[data-secudiag-input]").length).toBe(1);
  },
};

export const SvgIncluded: Story = {
  args: {
    diagramConf: {
      diagramNodes: [
        {id: "myfirstnode", nodeKind: "myDiscard", pos: {x: 0, y: 0}}
      ],
      availableNodes: [
        {
          nodeKind: "myDiscard",
          svgString: `<?xml version="1.0" encoding="UTF-8"?>
                      <!-- Created with Inkscape (http://www.inkscape.org/) -->
                      <svg width="10mm" height="8.2064mm" version="1.1" viewBox="0 0 10 8.2064" xmlns="http://www.w3.org/2000/svg">
                      <g transform="translate(-201.11 -6.6067)">
                      <g fill="#a00">
                      <g stroke="#000" stroke-linecap="round">
                      <path d="m201.72 10.71h5.3511" stroke-width=".58571"/>
                      <g stroke-width=".69398">
                      <path d="m207.25 14.466v-7.5124"/>
                      <path d="m209.07 13.136v-4.8512"/>
                      <path d="m210.76 12.103v-2.7859"/>
                      </g>
                      </g>
                      <circle class="input0" transform="rotate(90)" cx="10.71" cy="-201.83" r=".71958" data-secudiag-input="0"/>
                      </g>
                      <rect x="203.85" y="6.6067" width="7.3381" height="8.1907" fill="none"/>
                      </g>
                      </svg>
          `
        }
      ]
    }
  },
  play: async ({ canvas, userEvent, canvasElement }) => {
    const svg = canvasElement.querySelectorAll("svg");
    await expect(svg).not.toBe(null);
    await expect(canvasElement.querySelectorAll("[data-secudiag-input]").length).toBe(1);
  },
};
