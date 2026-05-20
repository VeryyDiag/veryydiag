// Svelte produces a wrong sourcemap, cf:
// - https://github.com/sveltejs/svelte/issues/9961
// - https://github.com/sveltejs/svelte/discussions/18187
// so in the meanwhile we isolate code relying on svelte-syntax ($derived, $state…)

/** I can't find a simple way to get fine-grained reactivity with nested structures,
 *  so here we create a cache with elements being equal to $derived operations
 *  and an $effect() makes sure to remove unused keys when necessary.
 *  See also https://stackoverflow.com/q/79923465/4987648
 */

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
//
// export function derivedMapFold<A,B>(l: A[], f: (elt: A, acc: B) => B) : B[]{
//   const res = $state<B[]>([])
//   $effect(() => {
//
//   })
//   return res
// }
//
// export function recursiveDerivedMapFold<A,B>(l: A[], f: (elt: A, acc: B) => B) : B[]{
//   $derived.by(() => {
//     console.log("Re-deriving all derivedProofDiagrams")
//     if (!this.isInProofMode()) {
//       return []
//     }
//     const currentProof = this.getCurrentProof();
//     const steps = currentProof.steps;
//     return new Proxy([], {
//       get(target, key) {
//         if (key === "length") {
//           return steps.length + 1
//         }
//         if (typeof key === "number") {
//           if (key === 0) {
//             //return currentProof.startingDiagram
//             return 1
//           }
//           else {
//             return $derived.by( () => {
//               const previousDiagram = Reflect.get(target, key - 1);
//               //proofApplyOneStep(previousDiagram, steps[key])
//               return previousDiagram * 2
//             })
//           }
//         }
//         throw new Error(`Trying to access the key ${String(key)} of the proxy which should either be 'length' or of type number (vs ${typeof key})`)
//       }
//     })
//   })
// }


// I ended up implementing my own solution, but see also
// https://discord.com/channels/457912077277855764/1023340103071965194/threads/1505869515249025077
export class MapReduce<A, B> {
  // Contained the list of derived value for m
  m: (() => B)[] = []
  l: A[]
  f: (acc: B, x:A, index: number) => B
  initialValue: B
  length: number
  constructor (l: A[], f: (acc: B, x:A, index: number) => B, initialValue: B) {
    this.l = l
    this.f = f
    this.initialValue = $derived(initialValue)
    this.length = $derived(this.l.length + 1);
  }

  get(i: number) : B {
    if (this.m?.[i] === undefined) { // This index was never queried before: we
      if (i === 0) {
        // We must return a function (=closure) otherwise a copy of the value will be sent instead
        this.m[i] = () => this.initialValue
      }
      else {
        const foo = $derived(this.f(this.get(i - 1), this.l[i-1], i-1))
        this.m[i] = () => foo
      }
    }
    return this.m[i]()
  }

  *[Symbol.iterator](){
		for(let i = 0; i < this.length; i += 1){
			yield this.get(i)
		}
	}
}
