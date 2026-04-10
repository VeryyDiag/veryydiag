import type { Viewport, Point, NodeID } from "$lib/types/types"
import { parse } from 'yaml'
import type { DiagramConfClass } from "$lib/contexts/context.svelte"
import { distanceEvent, centerEvent, IDAnchorToFullAnchor, clientToSVGCoord, clientToSVGCoordInCm, getParentLink, getParentNode } from '$lib/utils';

function isPartOfAnchor(node: SVGGraphicsElement) {
  return node.closest("[data-proofdiag-anchor]") !== null
}


export function panzoom(node: SVGSVGElement, diagramConfClass: DiagramConfClass | undefined) {
  if (diagramConfClass === undefined) {return}
  let dragging = false
  let start: { x: number; y: number } | null = null
  let startViewport: Viewport | null = null

  const pointers = new Map<number, PointerEvent>()
  let pinchStartDistance = 0
  let pinchStartViewport: Viewport | null = null

  function pointerdown(e: PointerEvent) {
    if (diagramConfClass === undefined) {return}
    if (e?.target instanceof SVGGraphicsElement) {
      if (!(e.target.matches("svg"))) return;
      pointers.set(e.pointerId, e)

      node.setPointerCapture(e.pointerId)

      if (pointers.size === 1) {
        dragging = true
        start = { x: e.clientX, y: e.clientY }
        startViewport = { ...diagramConfClass.getViewport() }
      }

      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinchStartDistance = distanceEvent(a, b)
        pinchStartViewport = { ...diagramConfClass.getViewport() }
        dragging = false
      }
    }
  }
  
  function pointermove(e: PointerEvent) {
    if (diagramConfClass === undefined) {return}
    if (!pointers.has(e.pointerId)) return

    pointers.set(e.pointerId, e)

    // PAN (1 doigt)
    if (pointers.size === 1 && dragging && start && startViewport) {
      const from = clientToSVGCoordInCm(node, e.clientX, e.clientY)
      const to = clientToSVGCoordInCm(node, start.x, start.y)
      if (from === undefined || to === undefined) {
        console.log(`Weird, delta should never be undefined, please report a bug.`)
        return
      }

      const vp = diagramConfClass.getViewport()

      vp.x = startViewport.x - from.x + to.x
      vp.y = startViewport.y - from.y + to.y
    }

    // PINCH ZOOM (2 doigts)
    // TODO: I expect this to be broken, fix using clientToSVGCoordInCm
    if (pointers.size === 2 && pinchStartViewport) {
      const rect = node.getBoundingClientRect()

      const [a, b] = [...pointers.values()]

      const dist = distanceEvent(a, b)
      const scale = pinchStartDistance / dist

      const c = centerEvent(a, b)

      const mx = (c.x - rect.left) / rect.width
      const my = (c.y - rect.top) / rect.height

      const vp = diagramConfClass.getViewport()

      const worldX = pinchStartViewport.x + pinchStartViewport.w * mx
      const worldY = pinchStartViewport.y + pinchStartViewport.h * my

      const newW = pinchStartViewport.w * scale
      const newH = pinchStartViewport.h * scale

      vp.x = worldX - newW * mx
      vp.y = worldY - newH * my
      vp.w = newW
      vp.h = newH
    }
  }

  function pointerup(e: PointerEvent) {
    if (diagramConfClass === undefined) {return}
    if (pointers.size === 0) return;
    //return;
    pointers.delete(e.pointerId)

    node.releasePointerCapture(e.pointerId)

    if (pointers.size === 0) {
      dragging = false
    }
  }

  function wheel(e: WheelEvent) {
    if (diagramConfClass === undefined) {return}
    e.preventDefault()

    let delta = e.deltaY

    const multfactor = 3
    if (Math.abs(delta) < 100 / multfactor) {
      delta *= multfactor
    }

    delta = Math.max(-100, Math.min(100, delta))

    const zoom = Math.exp(delta * 0.002)

    const zoomCenter = clientToSVGCoordInCm(node, e.clientX, e.clientY)
    if (zoomCenter === undefined) {
      console.log("Weird, the zoomCenter is undefined?? Please report the bug.")
      return
    }
    const vp = diagramConfClass.getViewport()

    vp.x = zoomCenter.x + (vp.x - zoomCenter.x)*zoom
    vp.y = zoomCenter.y + (vp.y - zoomCenter.y)*zoom
    vp.w = vp.w * zoom
    vp.h = vp.h * zoom
  }

  node.addEventListener("pointerdown", pointerdown)
  node.addEventListener("pointermove", pointermove)
  node.addEventListener("pointerup", pointerup)
  node.addEventListener("pointercancel", pointerup)
  node.addEventListener("pointerleave", pointerup)

  node.addEventListener("wheel", wheel, { passive: false })

  return {
    destroy() {
      node.removeEventListener("pointerdown", pointerdown)
      node.removeEventListener("pointermove", pointermove)
      node.removeEventListener("pointerup", pointerup)
      node.removeEventListener("pointercancel", pointerup)
      node.removeEventListener("pointerleave", pointerup)
      node.removeEventListener("wheel", wheel)
    }
  }
}

/**
 * Drag a <g> element in SVG coordinates, compatible with pan/zoom
 * pos: { x, y } reactive state
 * diagramConfClass: DiagramConfClass (for current viewport)
 */
export function drag(node: SVGSVGElement, diagramConfClass: DiagramConfClass | undefined) {
  if (diagramConfClass === undefined) {return}

  let startPointer: { x: number; y: number } | null = null
  let startPos: Point | null = null
  let dragging = false
  const dragThreshold = 3
  let targetNodeID = $state<NodeID | undefined>(undefined)
  
  function pointerdown(e: PointerEvent) {
    if (diagramConfClass === undefined) {return}
    if (e?.target instanceof SVGGraphicsElement) {
      if (isPartOfAnchor(e.target)) {
        // If it is part of an anchor we want to create a link, not drag it
        targetNodeID = undefined
        return
      }
      const nodeID = (e.target.closest("[data-proofdiag-node]") as SVGGraphicsElement)?.dataset?.proofdiagNode
      if (nodeID !== undefined) {
        const pos = diagramConfClass.getPositionNode(nodeID)
        if (!('message' in pos)) {
          targetNodeID = nodeID
          startPointer = { x: e.clientX, y: e.clientY }
          startPos = { ...pos }
          dragging = false
          // IMPORTANT: we wait before capturing the pointer to check if we actually move
        } else {
          targetNodeID = undefined
        }
      } else {
        targetNodeID = undefined
      }
    } else {
      targetNodeID = undefined
    }
  }

  function pointermove(e: PointerEvent) {
    if (diagramConfClass === undefined) {return}
    if (targetNodeID === undefined) return;
    
    if (!startPointer || !startPos) return

    const dx = e.clientX - startPointer.x
    const dy = e.clientY - startPointer.y
    const dist = Math.hypot(dx, dy)

    // We drag only if we dragged during a long enough distance
    if (!dragging && dist >= dragThreshold) {
      dragging = true
      node.setPointerCapture(e.pointerId)
    }

    if (!dragging) return

    const from = clientToSVGCoordInCm(node, e.clientX, e.clientY)
    const to = clientToSVGCoordInCm(node, startPointer.x, startPointer.y)
    if (from === undefined) {
      console.log("Weird, 'from' is undefined?? Please report the bug.")
      return
    }
    if (to === undefined) {
      console.log("Weird, 'to' is undefined?? Please report the bug.")
      return
    }

    diagramConfClass.moveNode(targetNodeID, {x: startPos.x + from.x - to.x, y: startPos.y + from.y - to.y})
  }

  function pointerup(e: PointerEvent) {
    if (diagramConfClass === undefined) {return}
    if (targetNodeID === undefined) return;
    if (dragging) {
      e.preventDefault() // prevent click if we actually dragged
      e.stopPropagation()
      node.releasePointerCapture(e.pointerId)
    }

    startPointer = null
    startPos = null
    dragging = false
    targetNodeID = undefined
  }

  node.addEventListener("pointerdown", pointerdown)
  node.addEventListener("pointermove", pointermove)
  node.addEventListener("pointerup", pointerup)
  node.addEventListener("pointercancel", pointerup)
  node.addEventListener("pointerleave", pointerup)

  return {
    destroy() {
      node.removeEventListener("pointerdown", pointerdown)
      node.removeEventListener("pointermove", pointermove)
      node.removeEventListener("pointerup", pointerup)
      node.removeEventListener("pointercancel", pointerup)
      node.removeEventListener("pointerleave", pointerup)
    }
  }
}


export function drawLink(node: SVGSVGElement, diagramConfClass: DiagramConfClass | undefined) {
  if (diagramConfClass === undefined) {return}

  const pointers = new Map<number, PointerEvent>()

  function pointerdown(e: PointerEvent) {
    if (diagramConfClass === undefined) {return}
    if (e?.target instanceof SVGGraphicsElement) {
      const anchor = e.target.dataset?.proofdiagAnchor
      if (anchor === undefined) return;
      const parent = e.target.closest("[data-proofdiag-node]")
      if (parent instanceof SVGGraphicsElement) {
        const nodeName = parent.dataset?.proofdiagNode
        if (nodeName === undefined) {
          console.log(`Weird, anchor ${anchor} has no parent node?? Please report this bug.`)
          return;
        }

        pointers.set(e.pointerId, e)

        node.setPointerCapture(e.pointerId)

        if (pointers.size === 1) {
          const {x, y} = clientToSVGCoord(node, e.clientX, e.clientY) || {x: 0, y: 0}
          diagramConfClass.currentlyCreatedLink = { from: IDAnchorToFullAnchor(nodeName, anchor), to: {x, y}}
        }
      }
    }
  }

  function pointermove(e: PointerEvent) {
    if (diagramConfClass === undefined) {return}
    if (!pointers.has(e.pointerId)) return

    pointers.set(e.pointerId, e)

    // PAN (1 doigt)
    if (pointers.size === 1 && diagramConfClass.currentlyCreatedLink) {
      const {x, y} = clientToSVGCoord(node, e.clientX, e.clientY) || {x: 0, y: 0}
      diagramConfClass.currentlyCreatedLink.to = {x, y}
    }
  }

  function pointerup(e: PointerEvent) {
    if (diagramConfClass === undefined) {return}
    if (pointers.size === 0) {
      return
    }
    pointers.delete(e.pointerId)
    node.releasePointerCapture(e.pointerId)
    if (diagramConfClass.currentlyCreatedLink === undefined) return
    const from = diagramConfClass.currentlyCreatedLink.from
    diagramConfClass.currentlyCreatedLink = undefined


    for (const elt of document.elementsFromPoint(e.clientX, e.clientY)) {
      if (elt instanceof SVGGraphicsElement) {
        if (elt === node) return; // We don't want to go outside of the current SVG
        const anchor = elt.dataset?.proofdiagAnchor
        if (anchor === undefined) continue; // We released outside of any anchor
        const parent = elt.closest("[data-proofdiag-node]")
        if (parent instanceof SVGGraphicsElement) {
          const nodeName = parent.dataset?.proofdiagNode
          if (nodeName === undefined) {
            console.log(`Weird, anchor ${anchor} has no parent node?? Please report this bug.`)
            continue;
          }

          diagramConfClass.addLink({from, to: IDAnchorToFullAnchor(nodeName, anchor)});
          return
        }
      }
    }
  }

  node.addEventListener("pointerdown", pointerdown)
  node.addEventListener("pointermove", pointermove)
  node.addEventListener("pointerup", pointerup)
  node.addEventListener("pointercancel", pointerup)
  node.addEventListener("pointerleave", pointerup)

  return {
    destroy() {
      node.removeEventListener("pointerdown", pointerdown)
      node.removeEventListener("pointermove", pointermove)
      node.removeEventListener("pointerup", pointerup)
      node.removeEventListener("pointercancel", pointerup)
      node.removeEventListener("pointerleave", pointerup)
    }
  }
}


export function selectElement(node: SVGSVGElement, diagramConfClass: DiagramConfClass | undefined) {
  if (diagramConfClass === undefined) {return}

  let initialPos = {clientX: 0, clientY: 0} // We don't want to mix drag & drop from clicking
  let maxDistance = 0
  
  function pointerdown(e: PointerEvent) {
    if (diagramConfClass === undefined) {return}
    initialPos = {clientX: e.clientX, clientY: e.clientY }
    maxDistance = 0
  }

  function pointermove(e: PointerEvent) {
    if (diagramConfClass === undefined) {return}
    maxDistance = Math.max(maxDistance, distanceEvent(initialPos, e))
  }

  function click(e: PointerEvent) {
    if (diagramConfClass === undefined) {return}
    // We moved too much, can't be a click
    if (maxDistance > 4) {
      return
    }
    if (e?.target instanceof SVGGraphicsElement) {
      const parentLinkID = getParentLink(e.target)?.dataset?.proofdiagLink
      const parentNodeID = getParentNode(e.target)?.dataset?.proofdiagNode
      if (parentLinkID) {
        diagramConfClass.toogleLinkSelection(parentLinkID)
      } else if (parentNodeID) {
        diagramConfClass.toogleNodeSelection(parentNodeID)
      } else if (e.target === node) {
        diagramConfClass.clearSelection()
      }
    }
  }
  
  node.addEventListener("pointerdown", pointerdown)
  node.addEventListener("pointermove", pointermove)
  node.addEventListener("click", click)

  return {
    destroy() {
      node.removeEventListener("pointerdown", pointerdown)
      node.removeEventListener("pointermove", pointermove)
      node.removeEventListener("click", click)
    }
  }
}

export function removeSelection(node: SVGSVGElement, diagramConfClass: DiagramConfClass | undefined) {
  if (diagramConfClass === undefined) {return}

  function keydown(e: KeyboardEvent) {
    if (diagramConfClass === undefined) {return}
    if (["Delete", "Backspace"].includes(e.key)) {
      diagramConfClass.removeSelection()
    }
  }

  node.addEventListener('keydown', keydown)

  return {
    destroy() {
      node.removeEventListener("keydown", keydown)
    }
  }

}

export function addNodeToDiagram(node: HTMLElement, diagramConfClass: DiagramConfClass | undefined) {
  if (diagramConfClass === undefined) {return}

  function dragstart(e: DragEvent) {
    if (e.dataTransfer && e.target instanceof HTMLElement && e.target?.dataset?.proofdiagAvailableNode !== undefined) {
      e.dataTransfer.setData("proofdiag/available-node-kind", e.target.dataset.proofdiagAvailableNode);
    }
  }

  // Cancel dragover so that drop can fire
  function dragover(ev: DragEvent) {
    ev.preventDefault();
  }

  function drop(e: DragEvent) {
    if (diagramConfClass === undefined || !e.dataTransfer ) {return}
    // Check if dropped on the SVG
    if (e.target instanceof Element) {
      const svg = e.target.closest("[data-proofdiag-main-svg]")
      if (svg instanceof SVGSVGElement) {
        if (svg && e.dataTransfer.getData("proofdiag/available-node-kind")) {
          const pos = clientToSVGCoordInCm(svg, e.clientX, e.clientY)
          if (pos !== undefined) {
            diagramConfClass.addNode(e.dataTransfer.getData("proofdiag/available-node-kind"), pos)
          }
        }
      }
    }
  }

  node.addEventListener('dragstart', dragstart)
  node.addEventListener('drop', drop)
  node.addEventListener('dragover', dragover)

  return {
    destroy() {
      node.removeEventListener("dragstart", dragstart)
      node.removeEventListener("drop", drop)
      node.removeEventListener("dragover", dragover)
    }
  }
}

// This allows us to paste content to import them instead of going through files
export function pasteFile(node: HTMLElement, diagramConfClass: DiagramConfClass) {
  async function handleFile(file: File) {
    try {
      const content = await file.text();
      diagramConfClass.setConfig(parse(content));
      diagramConfClass.sendNotification("info", "The file was loaded with success.");
    } catch (error) {
      diagramConfClass.sendNotification("error", `Error while loading the file (${error}).`);
    }
  }

  async function handleText(text: string) {
    try {
      diagramConfClass.setConfig(parse(text));
      diagramConfClass.sendNotification("info", "Content pasted successfully.");
    } catch (error) {
      diagramConfClass.sendNotification("error", `Error while parsing pasted content (${error}).`);
    }
  }

  function onPaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          handleFile(file);
          return;
        }
      }

      if (item.kind === "string") {
        item.getAsString((text) => {
          if (text.trim()) {
            handleText(text);
          }
        });
        return;
      }
    }
  }

  node.addEventListener("paste", onPaste);

  return {
    destroy() {
      node.removeEventListener("paste", onPaste);
    }
  };
}
