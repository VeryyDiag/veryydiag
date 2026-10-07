import type { Component } from 'svelte';
import type { Node } from '#lib/types/types.js';

// ===================== SVG =====================
// This provides a list of default SVG files that you may use in any theory as a starting point

const allImages = import.meta.glob<{ default: string }>('./allNodes/builtins/**/*.svg', {
  query: '?raw',
  eager: true
});

// The same SVG image may be used by multiple theories and we may not want to always redefine them all. Hence we provide a list of
// SVG images that can be used via svgName and that have lower priority than user-defined images (possible to change styles etc)
const officialNodeImagesList: { [x: string]: string } = Object.fromEntries(
  Object.entries(allImages).map(([k, v]) => [
    k
      .replace(/^.\/allNodes\/builtins/i, 'builtins')
      .replace(/\.svg$/, '')
      .replace(/\//g, '.'),
    v.default
  ])
);

export const allDefaultSvgNames = Object.keys(officialNodeImagesList);

export function officialSvgNameToSvgString(svgName: string): string | undefined {
  return officialNodeImagesList[svgName];
}

// ===================== Components =====================
// Most of the time the NodeGeneric component will be enough, but in some cases one may want/need to define a more involved component.

const allComponents = import.meta.glob<{ default: Component<any> }>('./allNodes/Node*.svelte', {
  eager: true
});

// The same SVG image may be used by multiple theories and we may not want to always redefine them all. Hence we provide a list of
// SVG images that can be used via svgName and that have lower priority than user-defined images (possible to change styles etc)
const componentNameToComponent_: { [x: string]: Component<any> } = Object.fromEntries(
  Object.entries(allComponents).map(([k, v]) => [
    k.replace(/^.\/allNodes\/Node/i, 'Node').replace(/\.svelte/, ''),
    v.default
  ])
);

// This maps the name of a component to its actual component that you can load
export function componentNameToComponent(
  componentName: string | undefined
): Component<any> | undefined {
  return componentNameToComponent_[componentName || 'NodeGeneric'];
}
