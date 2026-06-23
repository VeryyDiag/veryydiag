// Svelte produces a wrong sourcemap, cf:
// - https://github.com/sveltejs/svelte/issues/9961
// - https://github.com/sveltejs/svelte/discussions/18187
// so in the meanwhile we isolate code relying on svelte-syntax ($derived, $state…)


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
