import { v4 as uuidv4 } from 'uuid';
import type { AnchorName, IDAnchor, NodeID, Point, ParamValue } from './types/types';

// This file contains generic utils functions

export function errToUndef<T>(x: () => T) : T | undefined {
  try {
    return x()
  } catch (e) {
    return undefined
  }
}

export function assertTrue(x: boolean, m: string): true {
  if (!x) {
    throw new Error(m)
  } else {
    return true
  }
}


export function assertNotUndefined<T>(x: T | undefined, m: string): NonNullable<T> {
  if (x === undefined || x === null) {
    throw new Error(m)
  } else {
    return x
  }
}

/** Like assertNotUndefined but don't return anything (NR = No Return) to help typescript to infer something about the input.
 * See https://github.com/microsoft/TypeScript/issues/40562 and https://github.com/microsoft/TypeScript/issues/34636
 */
export function assertNotUndefinedNR<T>(x: T | undefined, m: string): asserts x is NonNullable<T> {
  if (x === undefined || x === null) {
    throw new Error(m)
  }
}

export function assertDontThrow<T>(f: () => T, m: string): T {
  try {
    return f()
  } catch (e) {
    throw new Error(`${m}: (${e})`)
  }
}

export function toBoolean(x: string | boolean | number) {
  if (typeof x === 'string' ) {
    if (x === "true") {
      return true
    } else if (x === "false") {
      return false
    } else {
      throw new Error(`Impossible to convert string "${x}" into a boolean`)
    }
  } else if (typeof x === 'number') {
    throw new Error("Expecting a boolean but got a number ${x}")
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
    throw new Error(`The type "${typeof x}" is not string, number or boolean.`)
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


export const areSetsEqual = <T>(a: Set<T>, b: Set<T>) => a.size === b.size && [...a].every(value => b.has(value));

export function listsAreUniqueAndIdenticalSets(a: string[], b: string[]) : boolean {
  const aSet = new Set(a)
  const sa = aSet.size
  const bSet = new Set(b)
  const sb = bSet.size
  return sa === a.length && sb === b.length && sa === sb && areSetsEqual(aSet, bSet)
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

/** I can't find a simple way to get fine-grained reactivity with nested structures,
 *  so here we create a cache with elements being equal to $derived operations
 *  and an $effect() makes sure to remove unused keys when necessary.
 * https://stackoverflow.com/q/79923465/4987648
 */
// 
// export function createReactiveMap2D<S, K1, K2, U>(
//   getSource: () => S,
//   options: {
//     getOuterKeys: (source: S) => Iterable<K1>
//     getInnerKeys: (source: S, k1: K1) => Iterable<K2>
//     transform: (source: S, k1: K1, k2: K2) => U
//   }
// ) {
//   const { getOuterKeys, getInnerKeys, transform } = options
//   
//   const mapped = $state(new Map<K1, Map<K2, U>>())
//   
//   $effect(() => {
//     const source = getSource()
//     console.log("Re-running effect")
//     const outerKeys = new Set(getOuterKeys(source))
//     
//     // Remove deleted outer keys
//     for (const k1 of mapped.keys()) {
//       if (!outerKeys.has(k1)) {
//         mapped.delete(k1)
//       }
//     }
//     
//     console.log("outerKeys", outerKeys)
//     // source?.[outerKeys[0]]?.availableNodes
//     // console.log("outerKeys", source?.[outerKeys[0]]?.availableNodes)
//     for (const k1 of outerKeys) {
//       if (!mapped.has(k1)) {
//         mapped.set(k1, new Map())
//       }
//       
//       const innerMap = mapped.get(k1)!
//       const innerKeys = new Set(getInnerKeys(source, k1))
//       
//       // Remove deleted inner keys
//       for (const k2 of innerMap.keys()) {
//         if (!innerKeys.has(k2)) {
//           innerMap.delete(k2)
//         }
//       }
//       
//       // Add missing entries
//       console.log("innerKeys", innerKeys)
//       for (const k2 of innerKeys) {
//         if (!innerMap.has(k2)) {
//           const d: U = $derived(
//             transform(source, k1, k2)
//           )
//           innerMap.set(k2, d)
//         }
//       }
//     }
//   })
//   
//   return mapped
// }


export function createReactiveMap2D<S, U>(
  getSource: () => S, // Needed or reactivity is lost (avoid to use class)
  options: {
    getOuterKeys: (source: S) => Iterable<string>
    getInnerKeys: (source: S, k1: string) => Iterable<string>
    transform: (source: S, k1: string, k2: string) => U
  }
) {
  const { getOuterKeys, getInnerKeys, transform } = options
  
  const mapped = $state<Record<string, Record<string, U>>>({})
  
  $effect(() => {
    const source = getSource()
    const outerKeys = new Set(getOuterKeys(source))
    
    // Remove deleted outer keys
    for (const k1 of Object.keys(mapped)) {
      if (!outerKeys.has(k1)) {
        delete mapped[k1]
      }
    }
    
    for (const k1 of outerKeys) {
      if (mapped?.[k1] === undefined) {
        mapped[k1] = {}
      }
      
      const innerMap = mapped[k1]
      const innerKeys = new Set(getInnerKeys(source, k1))
      
      // Remove deleted inner keys
      for (const k2 of Object.keys(innerMap)) {
        if (!innerKeys.has(k2)) {
          delete innerMap[k2]
        }
      }
      
      // Add missing entries
      for (const k2 of innerKeys) {
        if (innerMap?.[k2] === undefined) {
          const d: U = $derived(
            transform(source, k1, k2)
          )
          innerMap[k2] = d
        }
      }
    }
  })
  
  return mapped
}
