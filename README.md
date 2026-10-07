# VeryyDiag

**VeryyDiag** (the 2 'y' is not a typo!) is a generic web-based program allowing you to write diagrammatic proofs by applying some graph rewriting rules, in a spirit close to the ZX-calculus. However, you have lot's of freedom here: just define your basic nodes (via the builtin template or via a generic SVG image with some special attributes to define connections) and rewriting rules (defined within the software), and you can prove that two graphs are equivalent based on these rewriting rules!

VeryyDiag aims to be highly customizable via a plugin system.

VeryyDiag is the first step of our bigger project that aims to build a new framework to write formal security proofs.

> [!CAUTION]
> VeryyDiag is very young, under heavy development, and far from being considered as stable. As such, it contains many glitches/bugs (see e.g. the file `README_DEV.md` for a non-exhaustive list of bugs and missing features). Some features are not yet completely implemented (type system, parameters), buggy (e.g. SVG export does not export properly parametrized nodes…) or properly tested. As such, features may be added/removed/changed without notice, possibly corrupting your files or changing its look. Moreover, many features (induction, nested diagrams and more!) are yet to come! The documentation is also non-existent for now, so you may need to read the source code to understand advanced technics.

> [!TIP]
> You will soon be able to try the app at https://veryydiag.github.io/veryydiag/


## Why this name "VeryyDiag" and how do you pronounce it?

Pronounce `VeryyDiag` like `Verydiag` (but you may spend more time on the `y` if you enjoy it!). `Diag` stands for `diagrams` (surprising no?) and `Veryy` for `verification` as we aim to provide formal verification tool based on diagram rewriting rules. Why `Veryy` and not `Veri`? For a bunch of reasons:
- `VeriDiag`/`VeryDiag` already existed in a completely different context (seems like good names are rare… at least I keep the same pronunciation), and maybe not veryy funnyy.
- A `y` looks close to a flipped `λ` that is common in verification/functional programming languages… and having a flipped `λ` next to a `y` allows us to have a fancy logo close to the fractal recursive Sierpiński triangle! (and recursion will plays a great role in our tool!)


## Contributor

The main developer of this project is [Léo Colisson Palais](https://leo.colisson.me/).

## Contribute

If you want to contribute to this project, see [the file `README_DEV.md`](./README_DEV.md). So far this code is human-written (no AI except for debugging/good practice/non-important tasks like styling), and while we can't really forbid AI usage, we ask you to perfectly understand your submitted code and its implications, and you should be able to justify all technical choices you made.

## To know

- Gwenview [does not support nested SVG](https://bugs.kde.org/show_bug.cgi?id=518490), so don't be surprised if you open the diagram there and all nodes are gone. Open them with a browser, inkscape, another image viewer, emacs…

## Related projects

Here is a non-exhaustive list of related softwares:
- [ZxLive](https://github.com/zxcalc/zxlive) Cons: specific to ZX-calculus. Pros: specific to ZX-calculus.
- [Gephi]() Visualize huge graphs, no web, not related to math. Impossible to write equivalences between graphs.
- [yED](https://www.yworks.com/yed-live/) Create generic diagrams, not related to math at all. Can't apply rules etc. [The software and SDK yFiles](https://www.yfiles.com/) is also not open source.
- See softwares listed in https://en.wikipedia.org/wiki/Gephi
