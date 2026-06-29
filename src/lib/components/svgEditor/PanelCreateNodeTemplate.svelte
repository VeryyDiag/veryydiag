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

  // Just copy/pasted from the doc and https://github.com/mathjax/MathJax/issues/3584#issuecomment-4826341132:
  // ---------

  // https://github.com/mathjax/MathJax/issues/3584#issuecomment-4826341132
  onMount(async () => {
    window.MathJax = {
    loader: {
        load: ['input/tex', 'output/svg'],
        paths: {
          mathjax: './node_modules/mathjax',
        },
        svg: { fontCache: 'none' }, // Required for standalone svg
      },
    };
    try {
      // @ts-expect-error: mathjax/startup.js doesn't have a .d.ts file
      await import('mathjax/startup.js');
      await assertNotUndefined(MathJax?.startup, `MathJax.startup is not defined`).promise;
    } catch (e) {
      // We don't throw here because each time svelte hot-reloads, MathJax.startup is undefined for
      // a reason I don't understand yet, and it blocks the whole app.
      console.log(e)
    }
	});

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

  async function getSvgImage(math: string, options = {}) : Promise<string> {
    const adaptor = assertNotUndefined(MathJax?.startup, `MathJax.startup is not defined`).adaptor;
    const result = await assertNotUndefined(MathJax.tex2svgPromise, `MathJax.tex2svgPromise is not defined`)(math, options);
    const svg = adaptor.tags(result, 'svg')[0];
    const defs = adaptor.tags(svg, 'defs')[0] || adaptor.append(svg, adaptor.create('defs'));
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
    tex: string,
    height: number,
    scale: number,
    mainNodeColor: string,
    anchors: {name: string, posX: number, posY: number, color: string, radius: number}[]
  }

  const defaultSvgParameters : SvgParameters = {
    tex: "\\sqrt{\\cdot}",
    /** Height in cm */
    height: 0.7,
    /** For the preview */
    scale: 1,
    mainNodeColor: "white",
    anchors: [],
  }
  let svgParameters = $state<SvgParameters>(structuredClone(defaultSvgParameters))

  async function createSvg(svgParameters: SvgParameters) {
    try {
      // Read all reactive state BEFORE any await
      const x = $state.snapshot(svgParameters)
      const { tex, height, scale, mainNodeColor, anchors } = svgParameters;

      const texSvg = await getSvgImage(tex, {display: true})
      const extraSpacingAroundText = 300
      const strokeWidth = 100
      const extraSpacingAroundMargin = extraSpacingAroundText + strokeWidth/2 + 300

      const parser = new DOMParser()
      const doc = parser.parseFromString(texSvg, 'image/svg+xml')
      const svg = doc.querySelector('svg')

      assertNotUndefinedNR(svg, `Couldn't parse the svg image (no svg found)`)

      // We extend the viewbox and width/height
      const viewBox : number[] = assertNotUndefined(
        svg.getAttribute('viewBox')?.split(" ")?.map(x => parseFloat(x)),
        `Svg has no viewBox, please report a bug`)
      assertTrue(viewBox.length === 4, `Weird, the viewBox has ${viewBox.length} != 4 elements`)
      const viewboxXYWH = [viewBox[0] - extraSpacingAroundMargin,
                           viewBox[1] - extraSpacingAroundMargin,
                           viewBox[2] + 2*extraSpacingAroundMargin,
                           viewBox[3] + 2*extraSpacingAroundMargin]
      svg.setAttribute('viewBox', `${viewboxXYWH[0]} ${viewboxXYWH[1]} ${viewboxXYWH[2]} ${viewboxXYWH[3]}`)
      svg.setAttribute('height', `${scale*cm(height)}`)
      svg.setAttribute('width', `${scale*cm(svgParameters.height * viewBox[2] / viewBox[3])}`)

      // We create the rectangle
      const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
      const rectXYWH = [viewBox[0] - extraSpacingAroundText,
                        viewBox[1] - extraSpacingAroundText,
                        viewBox[2] + 2*extraSpacingAroundText,
                        viewBox[3] + 2*extraSpacingAroundText]
      rect.setAttribute('x', `${rectXYWH[0]}`)
      rect.setAttribute('y', `${rectXYWH[1]}`)
      rect.setAttribute('width', `${rectXYWH[2]}`)
      rect.setAttribute('height', `${rectXYWH[3]}`)
      rect.setAttribute('fill', mainNodeColor) // This way we can select the shape
      rect.setAttribute('stroke', 'black')
      rect.setAttribute('stroke-width', `${strokeWidth}`)

      // Add anchors
      svgParameters.anchors.forEach(({name, posX, posY, color, radius}) => {
        const circ = doc.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circ.setAttribute('cx', `${rectXYWH[0] + posX*rectXYWH[2]}`)
        circ.setAttribute('cy', `${rectXYWH[1] + posY*rectXYWH[3]}`)
        circ.setAttribute('r', `${radius * viewboxXYWH[3] / height}`)
        circ.setAttribute('data-proofdiag-anchor', name)
        circ.setAttribute('fill', color)
        svg.prepend(circ)
      })

      // We add the rectangle to the shape
      svg.prepend(rect)

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
        radius: 0.06
      }
      svgParameters.anchors.push(a)
    })
  }

  async function addNode() {
    const svg = await createSvg(svgParameters)
    diagramConfClass.addSVGNodeToTheory("My node", {svgString: svg});
  }

</script>

{#if createNodeTemplatePanel }
  <div class={["absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-6/10 h-7/10 flex flex-col items-center gap-2 p-5 overflow-x-auto overflow-y-auto", stylePanel]}>
    <!-- Floating close icon -->
    <button
      class={["absolute top-2 right-2 w-8 h-8 flex items-center justify-center !rounded-full hover:bg-blue-100", stylePanel]}
      aria-label="Close download panel"
      onclick={() => createNodeTemplatePanel = false}
      >
      <Icon icon="material-symbols:close-rounded" width="20" height="20" />
    </button>
    <h1 class="text-center text-lg font-normal text-body">Create node</h1>
    <p>{@html await createSvg({...svgParameters, scale: 2.5})}</p>
    <p>Text (LaTeX): <input class={styleInput} bind:value={svgParameters.tex} /></p>
    <p>Height: <input class={styleInput} bind:value={svgParameters.height} /> cm</p>
    <p>Color: <input class={styleInput} bind:value={svgParameters.mainNodeColor} /></p>
    <p>Anchors:</p>
    <ul>
      {#each svgParameters.anchors as anchor, i}
        <li class="list-disc">
          Name: <input class={`${styleInput} w-15`} bind:value={anchor.name} />
          x in [0,1]: <input class={`${styleInput} w-10`} bind:value={anchor.posX} />
          y in [0,1]: <input class={`${styleInput} w-10`} bind:value={anchor.posY} />
          Color: <input class={`${styleInput} w-15`} bind:value={anchor.color} />
          Radius: <input class={`${styleInput} w-15`} bind:value={anchor.radius} />
          <Button onclick={() => svgParameters.anchors.splice(i, 1)}><Icon icon="mdi:trash-outline" width="25" height="25" /></Button>
        </li>
      {/each}
    </ul>
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
