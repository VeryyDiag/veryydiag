import NodeDiscard from "./NodeDiscard.svelte";
import NodeCustom from "./NodeCustom.svelte";
import type { Component } from 'svelte';
import type { Node } from "$lib/types/types";

export const nameToComponent: {[x: string]: Component<any>} = { "NodeDiscard": NodeDiscard, "NodeCustom": NodeCustom }

