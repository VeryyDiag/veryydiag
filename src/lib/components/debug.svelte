<script>
  import { onMount } from "svelte";
  let container;
  let svgString = `
    <svg
      width="10.000006mm"
      height="8.206398mm"
x = "50"
      viewBox="0 0 10.000006 8.2063981"
      version="1.1"
      id="svg1"
      inkscape:version="1.4.2 (ebf0e940d0, 2025-05-08)"
      sodipodi:docname="NodeDiscard.svg"
      xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
      xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:svg="http://www.w3.org/2000/svg">
      <sodipodi:namedview
        id="namedview1"
        pagecolor="#ffffff"
        bordercolor="#000000"
        borderopacity="0.25"
        inkscape:showpageshadow="2"
        inkscape:pageopacity="0.0"
        inkscape:pagecheckerboard="0"
        inkscape:deskcolor="#d1d1d1"
        inkscape:document-units="mm"
        inkscape:zoom="10.24"
        inkscape:cx="3.515625"
        inkscape:cy="9.1308594"
        inkscape:window-width="2226"
        inkscape:window-height="1177"
        inkscape:window-x="0"
        inkscape:window-y="0"
        inkscape:window-maximized="1"
        inkscape:current-layer="layer1" />
      <defs
        id="defs1" />
      <g
        inkscape:label="Calque 1"
        inkscape:groupmode="layer"
        id="layer1"
        transform="translate(-201.10806,-6.6067453)">
        <path
          style="fill:#aa0000;stroke:#000000;stroke-width:0.585711;stroke-linecap:round;stroke-dasharray:none;stroke-opacity:1"
          d="m 201.72475,10.709942 h 5.35113"
          id="path2" />
        <path
          style="fill:#aa0000;stroke:#000000;stroke-width:0.693985;stroke-linecap:round;stroke-dasharray:none;stroke-opacity:1"
          d="M 207.24951,14.466151 V 6.9537378"
          id="path3" />
        <path
          style="fill:#aa0000;stroke:#000000;stroke-width:0.693985;stroke-linecap:round;stroke-dasharray:none;stroke-opacity:1"
          d="M 209.07313,13.135521 V 8.2843679"
          id="path4" />
        <path
          style="fill:#aa0000;stroke:#000000;stroke-width:0.693985;stroke-linecap:round;stroke-dasharray:none;stroke-opacity:1"
          d="M 210.76107,12.102901 V 9.3169882"
          id="path5" />
        <circle
          style="stroke-dasharray:none;stroke-linecap:round;stroke-width:0.693985;stroke:none;fill:#aa0000;"
          id="path6"
          cx="10.709942"
          cy="-201.82764"
          r="0.71957994"
          transform="rotate(90)"
          inkscape:label="input0"
          class="input0" />
      </g>
    </svg>
  `;
  
  let line = { x1: 0, y1: 0, x2: 0, y2: 0 };

  function getTransformToElement(fromElement, toElement) {
    // https://stackoverflow.com/questions/5891552/more-usage-of-gettransformtoelement
    return toElement.getScreenCTM().inverse().multiply(fromElement.getScreenCTM())
  }
  
  function updateLine(eltA, eltB) {
    const a = eltA.getBBox();
    const b = eltB.getBBox();
    // https://stackoverflow.com/questions/35373882/get-the-global-transform-matrix-of-an-svg-element
    const transformA = getTransformToElement(eltA, container);
    const transformB = getTransformToElement(eltB, container);
    console.log(transformA);
    console.log(transformB);
    let ptA = new DOMPoint(a.x + a.width / 2, a.y + a.height / 2);
    let ptB = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2);
    ptA = ptA.matrixTransform(transformA);
    console.log("avt",  JSON.stringify(ptB.toJSON()))
    ptB = ptB.matrixTransform(transformB);
    console.log("apres", JSON.stringify(ptB))
    /* var ptA = container.createSVGPoint();
     * ptA.x = a.x + a.width / 2;
     * ptA.y = a.y + a.height / 2;
     * ptA.matrixTransform(transformA);
     * var ptB = container.createSVGPoint();
     * ptB.x = b.x + b.width / 2;
     * ptB.y = b.y + b.height / 2;
     * ptB.matrixTransform(transformB); */
    line = {
      x1: ptA.x,
      y1: ptA.y,
      x2: ptB.x,
      y2: ptB.y
    };
    console.log(line)
  }

  onMount(() => {
    // Mount the svg
    let svgElt = container?.querySelector("svg");
    console.log(svgElt)
    svgElt.setAttribute('x', 100);
    updateLine(document.getElementById("A"), svgElt.querySelector(".input0"));
  });
</script>

<svg width="400" height="200">
  <rect id="A" x="50" y="50" width="80" height="40" fill="lightblue" />
  <rect id="B" x="250" y="120" width="80" height="40" fill="lightgreen" />
  <g bind:this={container}>
    {@html svgString}
  </g>
  <line
    x1={line.x1}
    y1={line.y1}
    x2={line.x2}
    y2={line.y2}
    stroke="black"
  />
</svg>
