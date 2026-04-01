import type { Viewport, Point, NodeID } from "$lib/types/types"
import type { DiagramConfClass } from "$lib/contexts/context.svelte"
import { distanceEvent, centerEvent, IDAnchorToFullAnchor, clientToSVGCoord, getParentLink, getParentNode } from '$lib/utils';

function isPartOfAnchor(node: SVGGradientElement) {
  return node.closest("[data-cryptodiag-anchor]") !== null
}

export function panzoom(node: SVGSVGElement, diagramConfClass: DiagramConfClass) {
  let dragging = false
  let start: { x: number; y: number } | null = null
  let startViewport: Viewport | null = null

  const pointers = new Map<number, PointerEvent>()
  let pinchStartDistance = 0
  let pinchStartViewport: Viewport | null = null

  function pointerdown(e: PointerEvent) {
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
    if (!pointers.has(e.pointerId)) return

    pointers.set(e.pointerId, e)

    const rect = node.getBoundingClientRect()

    // PAN (1 doigt)
    if (pointers.size === 1 && dragging && start && startViewport) {
      const dx = ((e.clientX - start.x) / rect.width) * startViewport.w
      const dy = ((e.clientY - start.y) / rect.height) * startViewport.h

      const vp = diagramConfClass.getViewport()

      vp.x = startViewport.x - dx
      vp.y = startViewport.y - dy
    }

    // PINCH ZOOM (2 doigts)
    if (pointers.size === 2 && pinchStartViewport) {
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
    if (pointers.size === 0) return;
    //return;
    pointers.delete(e.pointerId)

    node.releasePointerCapture(e.pointerId)

    if (pointers.size === 0) {
      dragging = false
    }
  }

  function wheel(e: WheelEvent) {
    e.preventDefault()

    const rect = node.getBoundingClientRect()
    const vp = diagramConfClass.getViewport()

    let delta = e.deltaY

    const multfactor = 3
    if (Math.abs(delta) < 100 / multfactor) {
      delta *= multfactor
    }

    delta = Math.max(-100, Math.min(100, delta))

    const zoom = Math.exp(delta * 0.002)

    const mx = (e.clientX - rect.left) / rect.width
    const my = (e.clientY - rect.top) / rect.height

    const worldX = vp.x + vp.w * mx
    const worldY = vp.y + vp.h * my

    const newW = vp.w * zoom
    const newH = vp.h * zoom

    vp.x = worldX - newW * mx
    vp.y = worldY - newH * my
    vp.w = newW
    vp.h = newH
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
export function drag(node: SVGGElement, diagramConfClass: DiagramConfClass) {

  let startPointer: { x: number; y: number } | null = null
  let startPos: Point | null = null
  let dragging = false
  const dragThreshold = 3
  let targetNodeID : NodeID | undefined = $state(undefined)
  
  function pointerdown(e: PointerEvent) {
    if (e?.target instanceof SVGGraphicsElement) {
      if (isPartOfAnchor(e.target)) {
        // If it is part of an anchor we want to create a link, not drag it
        targetNodeID = undefined
        return
      }
      const nodeID = e.target.closest("[data-cryptodiag-node]")?.dataset?.cryptodiagNode
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

    const rect = node.getBoundingClientRect()
    const vp = diagramConfClass.getViewport()

    const dxSVG = (dx / rect.width) * vp.w
    const dySVG = (dy / rect.height) * vp.h

    diagramConfClass.moveNode(targetNodeID, {x: startPos.x + dxSVG, y: startPos.y + dySVG})
  }

  function pointerup(e: PointerEvent) {
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


export function drawLink(node: SVGSVGElement, diagramConfClass: DiagramConfClass) {

  const pointers = new Map<number, PointerEvent>()

  function pointerdown(e: PointerEvent) {
    if (e?.target instanceof SVGGraphicsElement) {
      const anchor = e.target.dataset?.cryptodiagAnchor
      if (anchor === undefined) return;
      const parent = e.target.closest("[data-cryptodiag-node]")
      if (parent instanceof SVGGraphicsElement) {
        const nodeName = parent.dataset?.cryptodiagNode
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
    if (!pointers.has(e.pointerId)) return

    pointers.set(e.pointerId, e)

    const rect = node.getBoundingClientRect()

    // PAN (1 doigt)
    if (pointers.size === 1 && diagramConfClass.currentlyCreatedLink) {
      const {x, y} = clientToSVGCoord(node, e.clientX, e.clientY) || {x: 0, y: 0}
      diagramConfClass.currentlyCreatedLink.to = {x, y}
    }
  }

  function pointerup(e: PointerEvent) {
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
        const anchor = elt.dataset?.cryptodiagAnchor
        if (anchor === undefined) continue; // We released outside of any anchor
        const parent = elt.closest("[data-cryptodiag-node]")
        if (parent instanceof SVGGraphicsElement) {
          const nodeName = parent.dataset?.cryptodiagNode
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


export function selectElement(node: SVGSVGElement, diagramConfClass: DiagramConfClass) {
  let initialPos = {clientX: 0, clientY: 0} // We don't want to mix drag & drop from clicking
  let maxDistance = 0
  
  function pointerdown(e: PointerEvent) {
    initialPos = {clientX: e.clientX, clientY: e.clientY }
    maxDistance = 0
  }

  function pointermove(e: PointerEvent) {
    maxDistance = Math.max(maxDistance, distanceEvent(initialPos, e))
  }

  function click(e: PointerEvent) {
    // We moved too much, can't be a click
    if (maxDistance > 4) {
      return
    }
    if (e?.target instanceof SVGGraphicsElement) {
      const parentLinkID = getParentLink(e.target)?.dataset?.cryptodiagLink
      const parentNodeID = getParentNode(e.target)?.dataset?.cryptodiagNode
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

export function removeSelection(node: SVGSVGElement, diagramConfClass: DiagramConfClass) {

  function keydown(e: KeyboardEvent) {
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
