<script>
  import { onMount } from "svelte";
  import svgString from "./Nodes/NodeDiscard.svg?raw";
  let container;  
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
