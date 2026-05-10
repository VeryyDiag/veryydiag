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
