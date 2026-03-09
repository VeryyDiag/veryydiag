import { getContextDiagram, DiagramConfClass } from "$lib/contexts/context.svelte";
import type { Viewport } from "$lib/types/types";
import { cm, cmToUnit } from "$lib/utils";

export function panzoom(node: SVGSVGElement, diagramConfClass: DiagramConfClass) {
  let dragging = false
  let start: { x: number; y: number } | null = null
  let startViewport: Viewport | null = null

  function viewport(): Viewport {
    return diagramConfClass.getConfig()?.viewport || {x: 0, y: 0, w: 20, h: 20}
  }

  function pointerdown(e: PointerEvent) {
    dragging = true
    start = { x: e.clientX, y: e.clientY }
    startViewport = { ...viewport() }

    node.setPointerCapture(e.pointerId)
  }

  function pointermove(e: PointerEvent) {
    if (!dragging || !start || !startViewport) return

    const rect = node.getBoundingClientRect()

    const dx =
      ((e.clientX - start.x) / rect.width) * startViewport.w
    const dy =
      ((e.clientY - start.y) / rect.height) * startViewport.h

    const vp = viewport()

    vp.x = startViewport.x - dx
    vp.y = startViewport.y - dy
  }

  function pointerup(e: PointerEvent) {
    dragging = false
    node.releasePointerCapture(e.pointerId)
  }

  function wheel(e: WheelEvent) {
    e.preventDefault()

    const rect = node.getBoundingClientRect()
    const vp = viewport()

    let delta = e.deltaY

    console.log(delta, e.deltaMode)

    // amplification touchpad
    const multfactor = 3
    if (Math.abs(delta) < 100/multfactor) {
      delta *= multfactor
    }

    // clamp
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
  node.addEventListener("pointerleave", pointerup)

  node.addEventListener("wheel", wheel, { passive: false })

  return {
    destroy() {
      node.removeEventListener("pointerdown", pointerdown)
      node.removeEventListener("pointermove", pointermove)
      node.removeEventListener("pointerup", pointerup)
      node.removeEventListener("pointerleave", pointerup)
      node.removeEventListener("wheel", wheel)
    }
  }
}
