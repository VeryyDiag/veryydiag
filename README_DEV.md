# ProofDiag & CryptoDiag: how to contribute

Once you've created a project and installed dependencies with `npm install` start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Unit testing

You can test basic functions by creating a file called `*.test.ts` and that follows vitest syntax. To run all unit tests (including storybook, see below), run:
```
npm run test:unit
```

If you simply want to run tests non involving storybook (simpler to deploy since you don't need to install playwright), just run:
```
npm run test:unit:server
```

For debugging, the output of `console.log(…)` are shown above the tests, or you can also connect them to an actual debugger/chrome as described in https://vitest.dev/guide/learn/debugging-tests.html#debugging-tools.

## Testing with storybook

To test the project, you can run:
```sh
npm run storybook
```
and click on the `Run tests` button on the bottom left area of the window.

To add documentation via storybook, you should either enable `tags: ['autodocs']` or, for more freedom, create a file `YourComponent.mdx` with the markdown like this (`<Meta … />` helps to put the file in the right menu but also to avoid writing `of=` everywhere):
```
import { Title, Subtitle, Description, ArgTypes, Primary, Controls, Stories, Canvas, Meta, Story } from '@storybook/addon-docs/blocks';

import * as SvgEditorStories from './SvgEditor.stories.svelte';

<Meta of={SvgEditorStories} />

 Title:

<Title />

Subtitle:

<Subtitle />

Description:

<Description />

Here is the description written in the mdx itself

Arg types

<ArgTypes />

Primary and controls don't work (bug https://github.com/storybookjs/storybook/issues/33829) without explicit "of=":

<Primary/>

Per-story code:

Canvas (seems equivalent to Story):

<Canvas of={SvgEditorStories.Primary} />

Controls:

<Controls of={SvgEditorStories.Primary}/>

Story

<Story of={SvgEditorStories.Primary}/>

All stories

<Stories />
```

The title of the story is obtained via `title: 'Components usable by users/SvgEditor',` in the `defineMeta` argument, while the simpler way to set the description for the component is by putting a JSDoc comment like `/** My comment */` right above the `defineMeta`, or via `parameters.docs.description.component` (see https://storybook.js.org/docs/api/doc-blocks/doc-block-description#writing-descriptions). Stories can also get their description via  `<!-- This is the story **description** -->` above the story. The subtitle can be set via `parameters.docs.subtitle` but this is not documented, not sure if there is a better option. The documentation of the props are set via arguments on the type (not the destructuring!) part like:
```js
let {
    diagramConf = {}
  } : {
    /** My diagramConf config */
    diagramConf: DiagramConf
  } = $props();
```

## TODO

### Small bugs/features to correct/add quickly

- For now just clicking an anchor creates an invisible self-looping link. Add a minimal distance to travel so that a self link is added.
- If you paste, e.g., a number when editing an input zone, it resets the whole diagram!!
- Sometimes it seems like some nodes generated via the template are cut in the preview (e.g. with $\mathsf{KeyGen}$). Similarly, renaming a node (Enc) breaks the viewport.
- In the node template, anchors should be placed above the text, not below.
- Allow an option to re-edit a node created via the template.
- Renaming an available node does not rename the nodes in the rule


### More substantial changes

- Create ordered anchors that accept multiple ordered wires. Add an option to specify that the order may be arbitrary (needed when applying the rule), and make it work with boundaries, including multi-wire ones.
- Redefine the Node type so that it is distinct from AvailableNode
- Implement selection and operations on selection (drag, delete…)
- Visual tests https://itnext.io/you-dont-need-chromatic-ded8f5797de3
- Write more tests (and fix existing ones)
- Check if all errors are cached correctly
- Implement the unique constraint, and auto-increment the number when adding multiple anchors
- Run prettier and ESLint to have uniform code
- Implement a language like:
  ```
  Diagram {
    {linkA, linkB}, boundary* = A()
    myanchor: a* = B({linkA, linkB})
  }
  ```
  to also be able to "code" diagrams with a shorter syntax than YAML/JSON (may also be more LLM friendly as it consumes less tokens) and a CLI interface similar to Coq/Lean etc. To have a concise notation, we may omit anchors named like `in.0`, `in.1`… in the inputs and `out.0`… in the outputs.
- Implement cherry-picking to import only a theory/diagram/rule/… from a different diagram.
- Define "well formed" diagram, e.g. to avoid loops in circuits.
- Snap to the grid. Center nodes (and/or allow a custom center) instead of positionning them based on their top/right position.
