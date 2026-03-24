import type { Viewport, Point } from "$lib/types/types"
import type { DiagramConfClass } from "$lib/contexts/context.svelte"
import { unitToCm } from '$lib/utils';

export function panzoom(node: SVGSVGElement, diagramConfClass: DiagramConfClass) {
  let dragging = false
  let start: { x: number; y: number } | null = null
  let startViewport: Viewport | null = null

  const pointers = new Map<number, PointerEvent>()
  let pinchStartDistance = 0
  let pinchStartViewport: Viewport | null = null

  function viewport(): Viewport {
    return diagramConfClass.getConfig()?.viewport || { x: 0, y: 0, w: 20, h: 20 }
  }

  function distance(a: PointerEvent, b: PointerEvent) {
    return Math.hypot(
      a.clientX - b.clientX,
      a.clientY - b.clientY
    )
  }

  function center(a: PointerEvent, b: PointerEvent) {
    return {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2
    }
  }

  function pointerdown(e: PointerEvent) {
    if (!(e?.target as Element).matches("svg")) return;
    pointers.set(e.pointerId, e)

    node.setPointerCapture(e.pointerId)

    if (pointers.size === 1) {
      dragging = true
      start = { x: e.clientX, y: e.clientY }
      startViewport = { ...viewport() }
    }

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      pinchStartDistance = distance(a, b)
      pinchStartViewport = { ...viewport() }
      dragging = false
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

      const vp = viewport()

      vp.x = startViewport.x - dx
      vp.y = startViewport.y - dy
    }

    // PINCH ZOOM (2 doigts)
    if (pointers.size === 2 && pinchStartViewport) {
      const [a, b] = [...pointers.values()]

      const dist = distance(a, b)
      const scale = pinchStartDistance / dist

      const c = center(a, b)

      const mx = (c.x - rect.left) / rect.width
      const my = (c.y - rect.top) / rect.height

      const vp = viewport()

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
    const vp = viewport()

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
export function drag(node: SVGGElement, params: { pos: Point; diagramConfClass: DiagramConfClass }) {
  let startPointer: { x: number; y: number } | null = null
  let startPos: Point | null = null
  let dragging = false
  const dragThreshold = 3

  function pointerdown(e: PointerEvent) {
    startPointer = { x: e.clientX, y: e.clientY }
    startPos = { ...params.pos }
    dragging = false
    // IMPORTANT: on ne capture pas le pointer ici
  }

  function pointermove(e: PointerEvent) {
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

    const rect = node.ownerSVGElement!.getBoundingClientRect()
    const vp = params.diagramConfClass.getConfig().viewport || {x: 0, y: 0, w: 20, h: 20}

    const dxSVG = (dx / rect.width) * vp.w
    const dySVG = (dy / rect.height) * vp.h

    params.pos.x = startPos.x + dxSVG
    params.pos.y = startPos.y + dySVG
  }

  function pointerup(e: PointerEvent) {
    if (dragging) {
      e.preventDefault() // prevent click if we actually dragged
      e.stopPropagation()
      node.releasePointerCapture(e.pointerId)
    }

    startPointer = null
    startPos = null
    dragging = false
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
}7
