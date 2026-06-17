import { v4 as uuidv4 } from 'uuid';
import type { AnchorName, IDAnchor, NodeID, Point, ParamValue } from './types/types';
import { ProofDiagError } from './types/types';
import { List, Map, Set as SetIm, Collection } from "immutable"

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
  } else {
    throw new ProofDiagError(`Can't turn type ${typeof x} into a boolean`)
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

export function listHasNoDuplicateE(a: string[]) : true {
  const seen = a.filter((s => v => s.has(v) || !s.add(v))(new Set));
  if (seen.length !== 0) {
    throw new ProofDiagError(`The list has some duplicated values ${JSON.stringify(seen)}`)
  }
  return true
}

export function listsAreBijection(a: string[], b: string[]) : boolean {
  const s = new Set(a).size
  return s === (new Set(b)).size && s === a.length
}

export function listsAreNotOverlapping(a: string[], b: string[]) : boolean {
  const aS = new Set(a)
  const bS = new Set(b)
  return aS.intersection(bS).size === 0
}

export function listsAreEqualUpToOrdering(a: string[], b: string[]) : boolean {
  // Don't use set since we want [1] != [1,1]
  return isDeepEqual(a.toSorted(), b.toSorted())
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

/** A BiMap is basically an immutable map mapping a string (typically node or link ID)
 *  to a list of strings (potential candidates when trying to find a matching) where we can
 *  efficiently do inverse queries to recover for each candidate the list ID with the same candidate.
 *  This is used to efficiently update the list of candidates in the matching algorithm.
 */
export type BiMap<X, Y> = {
  forward: Map<X, SetIm<Y>>,
  backward: Map<Y, SetIm<X>>,
  /* List of items that have already been elected (the size being equal to 1 is
     not enough as we may have one candidate from the very beginning) */
  alreadyElected: SetIm<X>,
}

export function mapListFromEntriesDuplicate<X, Y>(m: List<[X, Y]>) : Map<X, List<Y>>{
  return m.groupBy(([x, y]) => x)
          .map(x =>
            x.map(([a,b]) => b)
          )
}

export function mapSetFromEntriesDuplicate<X, Y>(m: List<[X, Y]>) : Map<X, SetIm<Y>>{
  return mapListFromEntriesDuplicate(m).map(x => SetIm(x))
}

// I don't use flatten because of https://github.com/immutable-js/immutable-js/issues/1712
export function shallowFlatten<X>(m: List<Collection<unknown, X>>) : List<X> {
  const l : List<X> = List()
  return l.withMutations(l => m.forEach(xs => xs.forEach(x => l.push(x))))
}
//
// export function flattenLevel2<X>(m: List<List<Collection<unknown, X>>>) : List<X> {
//   const l : List<X> = List()
//   return l.withMutations(l =>
//     m.forEach(xss =>
//       xss.forEach(xs =>
//         xs.forEach(x =>
//           x => l.push(x)))))
// }


export function biMapFromMap<X, Y>(forward: Map<X, SetIm<Y>>) : BiMap<X, Y> {
  const l : List<[Y, X]> = shallowFlatten(List(forward).map(([k,vs]) => vs.map((v) : [Y, X] => [v, k])))
  const backward = mapSetFromEntriesDuplicate(l)
  return {forward, backward, alreadyElected: SetIm()}
}

/**
 * This is morally equivalent to saying bm.set(x, [y]), while making sure that the inverse map still works.
 * Additionally, we return an error if at the end, an element Y has zero candidates,
 * and we also update the alreadyElected item.
 */
export function biMapElectCandidate<X, Y>(bm: BiMap<X, Y>, x: X, y: Y) : BiMap<X, Y>{
  const oldCandidates = assertNotUndefined(
    bm.forward.get(x),
    `Can't get the value of the element ${x} in the bimap as it does not exist`)
  const backward = bm.backward.withMutations(backward => {
    oldCandidates.forEach(cand => backward.update(cand, (xs) => {
      // We will modify y later
      if (cand !== y) {
        assertNotUndefinedNR(xs, `Weird, xs should not be undefined, please report a bug`)
        const newXs = xs.delete(x)
        if (newXs.isEmpty()) {
          throw new ProofDiagError(`When trying to assign ${x} -> ${y}, the element '${cand}' in Y becomes impossible to match later.`)
        }
        return newXs
      }
    }))
    backward.set(y, SetIm([x]))
  })
  const forward = bm.forward.set(x, SetIm([y]))
  return {forward, backward, alreadyElected: bm.alreadyElected.add(x)}
}

/** If, during the matching, you know that some candidates are  */
export function biMapIntersectCandidates<X, Y>(bm: BiMap<X, Y>, x: X, ys: SetIm<Y>) : BiMap<X, Y>{
  const oldCandidates = assertNotUndefined(
    bm.forward.get(x),
    `Can't get the value of the element ${x} in the bimap as it does not exist`
  )
  const newCandidates = oldCandidates.intersect(ys)
  assertTrue(!newCandidates.isEmpty(),
             `After applying an intersection, no candidates are left for ${x}`
  )
  const forward = bm.forward.set(x, oldCandidates.intersect(ys))
  // We update 'backward' by saying that all other candidates should not anymore be linked with x
  const excludedCandidates = oldCandidates.subtract(ys)
  const backward = bm.backward.withMutations(backward => {
    excludedCandidates.forEach(cand => backward.update(cand, (xs) => {
      assertNotUndefinedNR(xs, `Weird, xs should not be undefined, please report a bug`)
      const newXs = xs.delete(x)
      if (newXs.isEmpty()) {
        throw new ProofDiagError(`When trying to assign ${x} -> ${ys.toString()} during an intersection operation, the element '${cand}' in Y becomes impossible to match later.`)
      }
      return newXs
    }))
  })
  return {forward, backward, alreadyElected: bm.alreadyElected}
}

/** Get an element from the bimap and checks that it exists and is unique (only one candidate) */
export function biMapGetUnique<X, Y>(bm: BiMap<X, Y>, x: X) : Y {
  const candidates = assertNotUndefined(
    bm.forward.get(x),
    `Can't get the value of the element ${x} in the bimap as it does not exist`
  )
  assertTrue(candidates.size === 1, `Weird, we expect exactly one candidate`)
  return assertNotUndefined(candidates.first(), `Impossible, report a bug`)
}
