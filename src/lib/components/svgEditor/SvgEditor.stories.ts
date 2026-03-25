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
      diagramNodes: {
        myfirstnode: {nodeKind: "myDiscard", pos: {x: 0, y: 0}},
      },
      availableNodes: {
        myDiscard: {svgName: "cryptodiagDiscard"},
      }
  }},
  play: async ({ canvas, userEvent, canvasElement }) => {
    const svg = canvasElement.querySelectorAll("svg");
    await expect(svg).not.toBe(null);
    await expect(canvasElement.querySelectorAll('[data-secudiag-anchor="in.0"]').length).toBe(1);
  },
};

export const SvgIncluded: Story = {
  args: {
    diagramConf: {
      diagramNodes: {
        myfirstnode: {nodeKind: "myDiscard", pos: {x: 0, y: 0}}
      },
      availableNodes: {
        myDiscard: {
          svgString: `<?xml version="1.0" encoding="UTF-8"?>
                      <!-- Created with Inkscape (http://www.inkscape.org/) -->
                      <svg width="10mm" height="8.2064mm" version="1.1" viewBox="0 0 10 8.2064" xmlns="http://www.w3.org/2000/svg">
                       <g transform="translate(-201.11 -6.6067)">
                        <g fill="#a00">
                         <g stroke="#000" stroke-linecap="round">
                          <path d="m210.49 10.71h-5.3511" stroke-width=".58571"/>
                          <g stroke-width=".69398">
                           <path d="m204.97 6.9537v7.5124"/>
                           <path d="m203.14 8.2844v4.8512"/>
                           <path d="m201.46 9.317v2.7859"/>
                          </g>
                         </g>
                         <circle transform="rotate(-90)" cx="-10.71" cy="210.39" r=".71958" data-secudiag-anchor="out.0"/>
                        </g>
                        <rect x="201.13" y="6.6326" width="6.1753" height="8.1649" fill-opacity="0"/>
                       </g>
                      </svg>
                      `
        }
      }
    }
  },
  play: async ({ canvas, userEvent, canvasElement }) => {
    const svg = canvasElement.querySelectorAll("svg");
    await expect(svg).not.toBe(null);
    await expect(canvasElement.querySelectorAll('[data-secudiag-anchor="out.0"]').length).toBe(1);
  },
};

export const OnlySvg: Story = {
  args: {
    onlySvg: 1,
    diagramConf: {
      diagramNodes: {
        myfirstnode: {nodeKind: "myDiscard", pos: {x: 0, y: 0}}
      },
      availableNodes: {
        myDiscard: {
          svgString: `<?xml version="1.0" encoding="UTF-8"?>
                      <!-- Created with Inkscape (http://www.inkscape.org/) -->
                      <svg width="10mm" height="8.2064mm" version="1.1" viewBox="0 0 10 8.2064" xmlns="http://www.w3.org/2000/svg">
                       <g transform="translate(-201.11 -6.6067)">
                        <g fill="#a00">
                         <g stroke="#000" stroke-linecap="round">
                          <path d="m210.49 10.71h-5.3511" stroke-width=".58571"/>
                          <g stroke-width=".69398">
                           <path d="m204.97 6.9537v7.5124"/>
                           <path d="m203.14 8.2844v4.8512"/>
                           <path d="m201.46 9.317v2.7859"/>
                          </g>
                         </g>
                         <circle transform="rotate(-90)" cx="-10.71" cy="210.39" r=".71958" data-secudiag-anchor="out.0"/>
                        </g>
                        <rect x="201.13" y="6.6326" width="6.1753" height="8.1649" fill-opacity="0"/>
                       </g>
                      </svg>
                      `
        }
      }
    }
  },
  play: async ({ canvas, userEvent, canvasElement }) => {
    const svg = canvasElement.querySelectorAll("svg");
    await expect(svg).not.toBe(null);
    await expect(canvasElement.querySelectorAll('[data-secudiag-anchor="out.0"]').length).toBe(1);
  },
};

export const TwoNodes: Story = {
  args: {
    diagramConf:{
      diagramNodes: {
        myfirstnode: {nodeKind: "inputDiscard", pos: {x: 0, y: 0}},
        mysecondnode: {nodeKind: "discard", pos: {x: 2, y: 0}}
      },
      availableNodes: {
        inputDiscard: {svgName: "cryptodiagInputDiscard"},
        discard: {svgName: "cryptodiagDiscard"}
      }
  }},
  play: async ({ canvas, userEvent, canvasElement }) => {
    const svg = canvasElement.querySelectorAll("svg");
    await expect(svg).not.toBe(null);
    await expect(canvasElement.querySelectorAll('[data-secudiag-anchor="in.0"]').length).toBe(1);
    await expect(canvasElement.querySelectorAll('[data-secudiag-anchor="out.0"]').length).toBe(1);
  },
};


export const TwoNodesLinked: Story = {
  args: {
    diagramConf:{
      diagramNodes: {
        myfirstnode: {nodeKind: "inputDiscard", pos: {x: 0, y: 0}},
        mysecondnode: {nodeKind: "discard", pos: {x: 2, y: 0}},
      },
      availableNodes: {
        inputDiscard: {svgName: "cryptodiagInputDiscard"},
        discard: {svgName: "cryptodiagDiscard"},
      },
      links: [
        {
          from: "myfirstnode.out.0",
          to: "mysecondnode.in.0"
        },
      ],
  }},
  play: async ({ canvas, userEvent, canvasElement }) => {
    const svg = canvasElement.querySelectorAll("svg");
    await expect(svg).not.toBe(null);
    await expect(canvasElement.querySelectorAll('[data-secudiag-anchor="in.0"]').length).toBe(1);
    await expect(canvasElement.querySelectorAll('[data-secudiag-anchor="out.0"]').length).toBe(1);
    await expect(canvasElement.querySelectorAll('[data-secudiag-link]').length).toBe(1);
  },
};

