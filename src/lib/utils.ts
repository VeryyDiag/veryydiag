import { v4 as uuidv4 } from 'uuid';
import type { AnchorName, IDAnchor, NodeID, Point } from './types/types';
// This file contains generic utils functions

// getTransformToElement(fromElement, toElement) returns the matrix to apply to turn coordinate in the insideElement coordinate
// system into coordinates in outsideElement.
// This function was deprecated in SVG but practical, let's re-implement it with
// non-deprecated functions
// https://stackoverflow.com/questions/5891552/more-usage-of-gettransformtoelement
export function getTransformToElement(fromElement: SVGGraphicsElement, toElement: SVGGraphicsElement) : DOMMatrix | undefined {
  const m = fromElement.getScreenCTM()
  // This may be undefined, e.g. elements are not attached to the DOM
  if (m === null)
    return undefined
  else
    return toElement.getScreenCTM()?.inverse()?.multiply(m)
}

export function clientToSVGCoord(svg: SVGSVGElement, clientX: number, clientY: number) : Point | undefined {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;

  const ctm = svg.getScreenCTM();
  if (!ctm) return undefined;

  return point.matrixTransform(ctm.inverse());
}

export function clientToSVGCoordInCm(svg: SVGSVGElement, clientX: number, clientY: number) : Point | undefined {
  const pts = clientToSVGCoord(svg, clientX, clientY)
  if (pts === undefined) {
    return undefined
  }
  return {x: unitToCm(pts.x), y: unitToCm(pts.y)}
}

// SVG uses CSS px as the base units, and 1cm = 96px / 2.54. We prefer to assume that each small node fits inside a 1cm x 1cm box
// so we use cm as units here
export function cmToUnit(cm: number) {
  return cm * 96 / 2.54
}

// practical alias
export function cm(cm: number) {
  return cmToUnit(cm)
}

export function unitToCm(cm: number) {
  return cm * (2.54 / 96)
}

// crypto.randomUUID() only works on localhost or https.
export function randomID() : string {
  return uuidv4();
}

export function fullAnchorToIDAndAnchor(fullAnchor : string, defaultAnchor = "") : [string, string] {
  const [a, b, _] = fullAnchor.split(/\.(.*)/s)
  return [a, b || defaultAnchor]
}

export function IDAnchorToFullAnchor(node : NodeID, anchor: AnchorName) : IDAnchor {
  return `${node}.${anchor}`
}


/** Computes the distance between two event points */
export function distanceEvent(a: {clientX: number, clientY: number }, b: {clientX: number, clientY: number }) {
  return Math.hypot(
    a.clientX - b.clientX,
    a.clientY - b.clientY
  )
}

/** Computes the center between two event points */
export function centerEvent(a: PointerEvent, b: PointerEvent) {
  return {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2
    }
}

/** Returns the SVG parent element that is a link */
export function getParentLink(elt: SVGGraphicsElement) : SVGGraphicsElement | undefined {
  const p = elt.closest("[data-proofdiag-link]")
  if (p instanceof SVGGraphicsElement) {
    return p
  }
}

/** Returns the SVG parent element that is a node */
export function getParentNode(elt: SVGGraphicsElement) : SVGGraphicsElement | undefined {
  const p = elt.closest("[data-proofdiag-node]")
  if (p instanceof SVGGraphicsElement) {
    return p
  }
}

/** Download a string as file */
// https://stackoverflow.com/a/64908345/4987648
export function downloadStringAsFile(content: string, mimeType: string, filename: string){
  const a = document.createElement('a') // Create "a" element
  const blob = new Blob([content], {type: mimeType}) // Create a blob (file-like object)
  const url = URL.createObjectURL(blob) // Create an object URL from blob
  a.setAttribute('href', url) // Set "a" element link
  a.setAttribute('download', filename) // Set download filename
  a.click() // Start downloading
}


/** Capitalize the first letter of a string, https://stackoverflow.com/a/1026087/4987648 */
export function capitalizeFirstLetter(val: string) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}
