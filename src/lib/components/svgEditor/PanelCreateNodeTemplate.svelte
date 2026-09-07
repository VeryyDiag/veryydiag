<script lang="ts">
  /** Panel to create more complex nodes from templates (e.g. based on LaTeX) */
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import Button from '$lib/components/reusable/Button.svelte'
  import { stylePanel, styleInput } from './commonStyles.svelte';
  import SvgEditor from "./SvgEditor.svelte"
  import { mount } from 'svelte';
  import Toogle from '$lib/components/reusable/Toogle.svelte'
  import { assertTrue, assertNotUndefined, assertNotUndefinedNR, cm } from '$lib/utils';
	import { onMount } from 'svelte';

  let { createNodeTemplatePanel = $bindable() } = $props()

  let diagramConfClass = getContextDiagram()

  // See https://github.com/mathjax/MathJax/issues/3584#issuecomment-4837230205
  // ---------
  import {mathjax} from '@mathjax/src/js/mathjax.js';
  import {TeX} from '@mathjax/src/js/input/tex.js';
  import {SVG} from '@mathjax/src/js/output/svg.js';
  import {browserAdaptor} from '@mathjax/src/js/adaptors/browserAdaptor.js';
  import {RegisterHTMLHandler} from '@mathjax/src/js/handlers/html.js';
  import {Loader, CONFIG} from '@mathjax/src/js/components/loader.js';

  import '@mathjax/src/components/js/startup/init.js';
  import '@mathjax/src/components/js/core/core.js';
  import '@mathjax/src/components/js/input/tex/tex.js';
  import '@mathjax/src/components/js/output/svg/svg.js';

  Loader.preLoaded(
    'loader', 'startup',
    'core',
    'input/tex',
    'output/svg',
  );

  if (CONFIG?.paths === undefined) {
    CONFIG.paths = {}
  }
  //CONFIG.paths.mathjax = 'https://cdn.jsdelivr.net/npm/mathjax@4';  // uses CDN for dynamic tex packages
  CONFIG.paths.mathjax = './node_modules/@mathjax/src/bundle'; // uses local copy of MathJax for dynamic packages

  let adaptor: ReturnType<typeof browserAdaptor> | undefined = undefined

  // https://docs.mathjax.org/en/v4.0/web/convert.html#creating-stand-alone-svg-images
  const svgCss = [
    'svg a{fill:blue;stroke:blue}',
    '[data-mml-node="merror"]>g{fill:red;stroke:red}',
    '[data-mml-node="merror"]>rect[data-background]{fill:yellow;stroke:none}',
    '[data-frame],[data-line]{stroke-width:70px;fill:none}',
    '.mjx-dashed{stroke-dasharray:140}',
    '.mjx-dotted{stroke-linecap:round;stroke-dasharray:0,140}',
    'use[data-c]{stroke-width:3px}'
  ].join('');
  const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
  const SVGXMLNS = 'http://www.w3.org/2000/svg';

  async function getSvgImage(math: string, options: {[name: string]: string | number | boolean} = {}) : Promise<string> {
    // I can't move it outside of this function because it needs "window" to be defined, and if I put it inside a onMount
    // it would crash when hot-reloading
    if (adaptor === undefined) {
      adaptor = browserAdaptor();
      RegisterHTMLHandler(adaptor);
    }

    const doc = mathjax.document('', {
      InputJax: new TeX({
        //
        //  These packages are preloaded by the input/tex component.  You can leave out any you don't want.
        //  If you want additional ones, you will need to import the component definition file and add it to the
        //  Loader.preLoaded() call above.
        //
        packages: ['base', 'ams', 'newcommand', 'noundefined', 'textmacros', 'autoload', 'require'],
      }),
      OutputJax: new SVG({
        dynamicPrefix: '[mathjax-newcm]/svg/dynamic',   // where to load the font's dynamic ranges
      }),
    });

    const result = await doc.convertPromise(math, options);
    const svg = adaptor.tags(result, 'svg')[0];
    const defs = adaptor.tags(svg, 'defs')[0] || adaptor.append(svg, adaptor.node('defs', {}, []));
    adaptor.append(defs, adaptor.node('style', {}, [adaptor.text(svgCss)], SVGXMLNS));
    adaptor.removeAttribute(svg, 'role');
    adaptor.removeAttribute(svg, 'focusable');
    adaptor.removeAttribute(svg, 'aria-hidden');
    const g = adaptor.tags(svg, 'g')[0];
    adaptor.setAttribute(g, 'stroke', 'black');
    adaptor.setAttribute(g, 'fill', 'black');
    return xmlDeclaration + '\n' + adaptor.serializeXML(svg);
  }
  // ---------

  type SvgParameters = {
    method: "builtin.createNodeTemplate",
    tex: string,
    height: number,
    scale: number,
    mainNodeColor: string,
    anchors: {name: string, posX: number, posY: number, color: string, radius: number}[]
    extraSpacingAroundText: number,
    strokeWidth: number,
    extraSpacingAroundMargin: number,
    shape: "rectangle" | "circle"
  }

  const defaultSvgParameters : SvgParameters = {
    method: "builtin.createNodeTemplate",
    tex: "\\sqrt{\\cdot}",
    /** Height in cm */
    height: 0.4,
    /** For the preview */
    scale: 1,
    mainNodeColor: "white",
    anchors: [],
    extraSpacingAroundText: 0.15,
    strokeWidth: 0.02,
    extraSpacingAroundMargin: 0.1,
    shape: "rectangle",
  }
  let svgParameters = $state<SvgParameters>(structuredClone(defaultSvgParameters))

  async function createSvg(svgParameters: SvgParameters) {
    try {
      // Read all reactive state BEFORE any await
      const x = $state.snapshot(svgParameters)
      const { tex, height, scale, mainNodeColor, anchors, extraSpacingAroundText, strokeWidth, extraSpacingAroundMargin, shape } = svgParameters;

      // Height is the height of the latex itself, excluding the drawn line and anchors
      // +--viewport-----+                                        ^
      // | +--drawn----+ |          ^                             |
      // | | +-------+ | | ^        |                             |
      // | | | LaTeX | | | | height | + 2*extraSpacingAroundText  | + 2*extraSpacingAroundMargin
      // | | +-------+ | | v        |                             |
      // | +--border---+ |          v                             |
      // +---------------+                                        v
      // Note that extraSpacingAroundMargin and extraSpacingAroundText must be large enough to account for
      // the strokeWidth.
      // When the shape is a circle, we add margin to the LaTeX until it is a square, then we make sure
      // this square has the height 'height', then we draw a circle fitting this square.
      const texSvg = await getSvgImage(tex, {display: true})
      const distMultiplier = shape === "circle" ? Math.sqrt(2) : 1

      const parser = new DOMParser()
      const doc = parser.parseFromString(texSvg, 'image/svg+xml')
      const svg = doc.querySelector('svg')

      assertNotUndefinedNR(svg, `Couldn't parse the svg image (no svg found)`)

      // We extend the viewbox and width/height
      let viewBox : number[] = assertNotUndefined(
        svg.getAttribute('viewBox')?.split(" ")?.map(x => parseFloat(x)),
        `Svg has no viewBox, please report a bug`)
      assertTrue(viewBox.length === 4, `Weird, the viewBox has ${viewBox.length} != 4 elements`)
      // For circle we update the viewBox so that it becomes a square
      if (shape === "circle") {
        const m = Math.max(viewBox[2], viewBox[3])
        viewBox = [viewBox[0]-(m-viewBox[2])/2, viewBox[1]-(m-viewBox[3])/2, m, m]
      }
      // We need to convert between both coordinate systems (cm vs viewport)
      // using the fact that: viewBox_height = height * cmToVBCoord
      const cmToVBCoord = viewBox[3] / height

      // We create the drawn shape
      let shapeSVG : SVGElement = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
      let shapeXYWH = [0,0,0,0]
      let shapeFittingXYWH = [0,0,0,0]
      if (shape === "rectangle") {
        shapeXYWH = [viewBox[0] - extraSpacingAroundText * cmToVBCoord,
                     viewBox[1] - extraSpacingAroundText * cmToVBCoord,
                     viewBox[2] + 2 * extraSpacingAroundText * cmToVBCoord,
                     viewBox[3] + 2 * extraSpacingAroundText * cmToVBCoord]
        shapeFittingXYWH = shapeXYWH
        shapeSVG.setAttribute('x', `${shapeXYWH[0]}`)
        shapeSVG.setAttribute('y', `${shapeXYWH[1]}`)
        shapeSVG.setAttribute('width', `${shapeXYWH[2]}`)
        shapeSVG.setAttribute('height', `${shapeXYWH[3]}`)
        shapeSVG.setAttribute('fill', mainNodeColor) // This way we can select the shape
        shapeSVG.setAttribute('stroke', 'black')
        shapeSVG.setAttribute('stroke-width', `${strokeWidth * cmToVBCoord}`)
      } else if (shape === "circle") {
        shapeXYWH = [viewBox[0] - extraSpacingAroundText * cmToVBCoord,
                     viewBox[1] - extraSpacingAroundText * cmToVBCoord,
                     viewBox[2] + 2 * extraSpacingAroundText * cmToVBCoord,
                     viewBox[3] + 2 * extraSpacingAroundText * cmToVBCoord]
        const [centerShapeX, centerShapeY] = [shapeXYWH[0] + shapeXYWH[2]/2,
                                              shapeXYWH[1] + shapeXYWH[3]/2]
        const r = shapeXYWH[2]*Math.sqrt(2)/2
        shapeFittingXYWH = [centerShapeX-r, centerShapeY-r, 2*r, 2*r]
        shapeSVG = doc.createElementNS('http://www.w3.org/2000/svg', 'circle')
        shapeSVG.setAttribute('cx', `${shapeXYWH[0]+shapeXYWH[2]/2}`)
        shapeSVG.setAttribute('cy', `${shapeXYWH[1]+shapeXYWH[3]/2}`)
        // sqrt ensures that the whole square fits inside (simpler to do math than trying to fit
        // the rectangle, and we can adujst with the margin if we really want a tighter node)
        shapeSVG.setAttribute('r', `${shapeXYWH[3] * distMultiplier/2}`)
        shapeSVG.setAttribute('fill', mainNodeColor) // This way we can select the shape
        shapeSVG.setAttribute('stroke', 'black')
        shapeSVG.setAttribute('stroke-width', `${strokeWidth * cmToVBCoord}`)
      }

      // Add anchors
      svgParameters.anchors.forEach(({name, posX, posY, color, radius}) => {
        const circ = doc.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circ.setAttribute('cx', `${shapeFittingXYWH[0] + posX*shapeFittingXYWH[2]}`)
        circ.setAttribute('cy', `${shapeFittingXYWH[1] + posY*shapeFittingXYWH[3]}`)
        circ.setAttribute('r', `${radius * cmToVBCoord}`)
        circ.setAttribute('data-veryydiag-anchor', name)
        circ.setAttribute('fill', color)
        svg.appendChild(circ)
      })

      // We add the shape to the node
      svg.prepend(shapeSVG)

      // Setting the final viewbox
      const viewboxXYWH = [shapeFittingXYWH[0] - extraSpacingAroundMargin * cmToVBCoord,
                           shapeFittingXYWH[1] - extraSpacingAroundMargin * cmToVBCoord,
                           shapeFittingXYWH[2] + 2 * extraSpacingAroundMargin * cmToVBCoord,
                           shapeFittingXYWH[3] + 2 * extraSpacingAroundMargin * cmToVBCoord]
      const finalHeight = shapeFittingXYWH[3] / cmToVBCoord + 2 * extraSpacingAroundMargin
      svg.setAttribute('viewBox', `${viewboxXYWH[0]} ${viewboxXYWH[1]} ${viewboxXYWH[2]} ${viewboxXYWH[3]}`)
      svg.setAttribute('height', `${scale*cm(finalHeight)}`)
      svg.setAttribute('width', `${scale*cm(finalHeight * viewboxXYWH[2] / viewboxXYWH[3])}`)

      const newSvg = new XMLSerializer().serializeToString(svg)
      return newSvg
    } catch (e) {
      console.log("Error when converting to svg", e)
      return `Malformed svg ${e}`
    }
  }

  let nbElementsToAdd = $state(1)

  function addNAnchors(prefix: string, posX: number, nbElementsToAdd: number) {
    const dx = 2*nbElementsToAdd;
    const dh = 1 / dx;
    ([...Array(nbElementsToAdd).keys()]).forEach(i => {
      const a = {
        name: `${prefix}${i}`,
        posX,
        posY: (2*i+1)*dh,
        color: "black",
        radius: 0.05
      }
      svgParameters.anchors.push(a)
    })
  }

  let nodeKind = $state("myNode")
  async function addNode() {
    const svg = await createSvg(svgParameters)
    diagramConfClass.addSVGNodeToTheory(nodeKind, {svgString: svg, svgGenerationMethod: $state.snapshot(svgParameters)});
  }

</script>

{#if createNodeTemplatePanel }
  <div class={["absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-6/10 h-7/10 flex flex-col items-center gap-2 p-5 overflow-x-auto overflow-y-auto", stylePanel]}>
    <!-- Floating close icon -->
    <button
      class={["absolute top-2 right-2 w-8 h-8 flex items-center justify-center !rounded-full hover:bg-blue-100", stylePanel]}
      title="Close download panel"
      onclick={() => createNodeTemplatePanel = false}
      >
      <Icon icon="material-symbols:close-rounded" width="20" height="20" />
    </button>
    <h1 class="text-center text-lg font-normal text-body">Create node <input class={styleInput} bind:value={nodeKind} /></h1>
    <p>
      <span class="bg-gray-100 block">
        {@html await createSvg({...svgParameters, scale: 1.5})}
      </span>
    </p>
    <p>
      Text (LaTeX): <input class={styleInput} bind:value={svgParameters.tex} />
    </p>
    <p>Text height: <input class={styleInput} bind:value={svgParameters.height} type="number" step="0.1" /> cm
      <span class="mr-4"></span>
      Shape: <select class={styleInput} bind:value={svgParameters.shape}>
      <option value="rectangle">Rectangle</option>
      <option value="circle">Circle</option>
      </select>
      <span class="mr-4"></span>
      Color: <input class={styleInput} bind:value={svgParameters.mainNodeColor} />
      <span class="mr-4"></span>
    </p>
    <p>Anchors:</p>
    <ul>
      {#each svgParameters.anchors as anchor, i}
        <li class="list-disc">
          Name: <input class={`${styleInput} w-15`} bind:value={anchor.name} />
          x in [0,1]: <input class={`${styleInput} w-10`} bind:value={anchor.posX} type="number" step="0.1" />
          y in [0,1]: <input class={`${styleInput} w-10`} bind:value={anchor.posY} type="number" step="0.1"/>
          Color: <input class={`${styleInput} w-15`} bind:value={anchor.color} />
          Radius: <input class={`${styleInput} w-15`} bind:value={anchor.radius} type="number" step="0.01"/>
          <Button onclick={() => svgParameters.anchors.splice(i, 1)}><Icon icon="mdi:trash-outline" width="25" height="25" /></Button>
        </li>
      {/each}
    </ul>
    <p>Spacing around text <input class={`${styleInput} w-15`} bind:value={svgParameters.extraSpacingAroundText} type="number" step="0.05"/>, margin <input class={`${styleInput} w-15`} bind:value={svgParameters.extraSpacingAroundMargin} type="number" step="0.05"/> and stroke width <input class={`${styleInput} w-15`} bind:value={svgParameters.strokeWidth} type="number" step="0.01" /></p>
    <p>
      Add <input class={`${styleInput} w-15`} bind:value={nbElementsToAdd} type="number" />
      <Button onclick={() => addNAnchors("in.", 0, nbElementsToAdd)}>
        input(s)
      </Button> or
      <Button onclick={() => addNAnchors("out.", 1, nbElementsToAdd)}>
        output(s)
      </Button>
    </p>
    <p>
      <Button onclick={() => {diagramConfClass.undoSnapshot(); addNode()}}>Create new node</Button>
      <Button onclick={() => {svgParameters = defaultSvgParameters}}>Reset</Button>
    </p>
  </div>
{/if}
