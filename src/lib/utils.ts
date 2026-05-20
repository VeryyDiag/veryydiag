import { v4 as uuidv4 } from 'uuid';
import type { AnchorName, IDAnchor, NodeID, Point, ParamValue } from './types/types';
import { ProofDiagError } from './types/types';

// This file contains generic utils functions

/** Allow to modify non-destructively a nested array by working on a copy
 *  (super helpful in tests)
 *  A bit like "produce" by immer, except that we work on a full copy.
 *  This is also simpler and more typescript friendly (and less vitest buggy?)
 *  but less efficient since we do a full copy instead of the object instead of shallow copy…
 *  but maybe safer as well since both copies are really different.
 *  f must change its input destructively
 */
export function editCopy<A>(obj: A, f: (x: A) => void) : A {
  let objCopy = structuredClone(obj)
  f(objCopy)
  return objCopy
}

export function errToUndef<T>(x: () => T) : T | undefined {
  try {
    return x()
  } catch (e) {
    return undefined
  }
}

export function assertTrue(x: boolean, m: string): asserts x {
  if (!x) {
    throw new ProofDiagError(m)
  }
}


export function assertNotUndefined<T>(x: T | undefined, m: string): NonNullable<T> {
  if (x === undefined || x === null) {
    throw new ProofDiagError(m)
  } else {
    return x
  }
}

/** Like assertNotUndefined but don't return anything (NR = No Return) to help typescript to infer something about the input.
 * See https://github.com/microsoft/TypeScript/issues/40562 and https://github.com/microsoft/TypeScript/issues/34636
 */
export function assertNotUndefinedNR<T>(x: T | undefined, m: string): asserts x is NonNullable<T> {
  if (x === undefined || x === null) {
    throw new ProofDiagError(m)
  }
}

export function assertDontThrow<T>(f: () => T, m: string): T {
  try {
    return f()
  } catch (e) {
    throw new ProofDiagError(`${m}: (${e})`)
  }
}

// Use on pattern matching to ensure we never arrive here.
export function assertNever(x: never, m: string = `We should never enter this case`): never {
  throw new ProofDiagError(`${m}: ${x}`);
}

export function toBoolean(x: string | boolean | number) {
  if (typeof x === 'string' ) {
    if (x === "true") {
      return true
    } else if (x === "false") {
      return false
    } else {
      throw new ProofDiagError(`Impossible to convert string "${x}" into a boolean`)
    }
  } else if (typeof x === 'number') {
    throw new ProofDiagError("Expecting a boolean but got a number ${x}")
  } else if (typeof x === 'boolean') {
    return x
  }
}

export function toString(x: ParamValue) : string {
  if (typeof x === 'string' ) {
    return x
  } else if (typeof x === 'number') {
    return `${x}`
  } else if (typeof x === 'boolean') {
    return x ? "true" : "false"
  } else {
    throw new ProofDiagError(`The type "${typeof x}" is not string, number or boolean.`)
  }
}

export function recordIsBijection(x: Record<string,string>,
                            { filterLeft = (x) => true,
                              filterRight = (x) => true,
                            } : {
                              filterLeft?: ((x: string) => boolean),
                              filterRight?: ((x: string) => boolean),
                            } = {}) : boolean {
  return (new Set(Object.keys(x).filter(filterLeft))).size === (new Set(Object.values(x).filter(filterRight))).size
}

export function listsAreBijection(a: string[], b: string[]) : boolean {
  const s = new Set(a).size
  return s === (new Set(b)).size && s === a.length
}

// https://stackoverflow.com/a/77278013
export const isDeepEqual = <T>(a: T, b: T): boolean => {
  if (a === b) {
    return true;
  }

  const bothAreObjects = a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b);

  return Boolean(
    bothAreObjects &&
    Object.keys(a).length === Object.keys(b).length &&
    Object.entries(a).every(([k, v]) => isDeepEqual(v, b[k as keyof T]))
  );
};


export const areSetsEqual = <T>(a: Set<T>, b: Set<T>) => a.size === b.size && [...a].every(value => b.has(value));

export function areSetsEqualThrow<T>(a: Set<T>, b: Set<T>) : true {
  if (a.size === b.size && [...a].every(value => b.has(value))) {
    return true
  } else {
    const adiff = Array.from(a.difference(b))
    const bdiff = Array.from(b.difference(a))
    throw new ProofDiagError(`The sets are different: first set contains the values ${JSON.stringify(adiff)} not contained in second set, and second set contains ${JSON.stringify(bdiff)} not contained in first set`)
  }
}

export function listsAreUniqueAndIdenticalSets(a: string[], b: string[]) : boolean {
  const aSet = new Set(a)
  const sa = aSet.size
  const bSet = new Set(b)
  const sb = bSet.size
  return sa === a.length && sb === b.length && sa === sb && areSetsEqual(aSet, bSet)
}

export function listsAreUniqueAndIdenticalSetsThrow(a: string[], b: string[]) : true {
  const aSet = new Set(a)
  const sa = aSet.size
  const bSet = new Set(b)
  const sb = bSet.size
  if (sa !== a.length) {
    throw new ProofDiagError(`The first lists contains redundant items ${JSON.stringify(a.filter(x => aSet.has(x)))}`)
  }
  if (sb !== b.length) {
    throw new ProofDiagError(`The second lists contains redundant items ${JSON.stringify(b.filter(x => bSet.has(x)))}`)
  }
  return areSetsEqualThrow(aSet, bSet)
}

export function listIsUnique<T>(l: T[]) : boolean {
  const lSet = new Set(l)
  return l.length == lSet.size
}

export function values<T>(o: Record<string, T> | undefined) {
  return Object.values(o || {})
}

export function keys<T>(o: Record<string, T> | undefined) {
  return Object.keys(o || {})
}

export function entries<T>(o: Record<string, T> | undefined) {
  return Object.entries(o || {})
}


export function inverseBijection(o: Record<string, string>) : Record<string, string> {
  assertTrue(recordIsBijection(o), `This is not a bijection`)
  return Object.fromEntries(Object.entries(o).map(([k,v]) => [v, k]))
}

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

export function fullAnchorToIDAndAnchor(fullAnchor : IDAnchor, defaultAnchor = "") : [string, string] {
  const [a, b, _] = fullAnchor.split(/\.(.*)/s)
  return [a, b || defaultAnchor]
}

export function nodeFromIDAnchor(fullAnchor: IDAnchor) : NodeID {
  const [a, b] = fullAnchorToIDAndAnchor(fullAnchor)
  return a
}

export function anchorFromIDAnchor(fullAnchor: IDAnchor) : AnchorName {
  const [a, b] = fullAnchorToIDAndAnchor(fullAnchor)
  return b
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

/** Help with debug in expressions */
export function log<A>(x: A, m: string = "Logging ") : A {
  console.log(m, x)
  return x
}
