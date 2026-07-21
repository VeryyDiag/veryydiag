# VeryyDiag & CryptoDiag

This repository hosts two related projects:
- **VeryyDiag**: A generic web-based program called allowing you to write diagrammatic proofs by applying some graph rewriting rules. You have lot's of freedom here: just define your basic nodes (SVG images with some special attributes to define connections) and rewriting rules (from the software), and you can prove that two graphs are equivalent based on these rewriting rules.
- **CryptoDiag**: We also instantiate these rules to obtain a framework to write formal security proofs. Here are the goals that we try to reach when designing this tool (let's see how far we can go!):
  - **Quantum compatible**: existing frameworks can't really deal with the specificities of quantum cryptography where it is, for instance, impossible to copy a quantum state.
  - **Intuitive**: once you know the framework, it should be as simple as possible (at least compared to Easycrypt/Rocq…) to transfer an intuition of security like "this part is secret" into a formal security proof.
  - **Easy and quick to read/write**: proofs written into existing frameworks (EasyCrypt…) are just impossible to read and check without the help of a computer (complex strategies and SMT solvers make it even harder to understand). Reading the proof gives little intuition while we aim to provide a proof that is both checkable by humans and computers, and that is easy to read and write. Most researcher want to know why a statement is true, a statement like "it's true, trust the SMT" is not enough. We will of course provide strategies to help automatizing boring tasks (and plugins can be used to implement custom strategy, possibly relying on external programs/solvers/LLMs), but the final proofs is agnostic of the employed strategy and can easily be reviewed by the user.
  - **Expressive**: Hopefully we should be able to express arbitrarily complex statements while maintaining decent complexity.
  - **Minimal code to trust**: In EasyCrypt (as far as we understand) we need to trust a large code base, including the SMT solver that produces no proof summary that we can check separately (i.e. we need to also trust a full SMT solver… which also makes it very hard to check. Here, the goal is to have a tiny core to check diagrammatic rules in general (few hundreds of lines, see the file `rules.ts` that contains most of the core logic), and then one can just review the rules that are used in a precise proof so one does not even need to check a whole theory to check a proof. Additionally the proof can be read (and checked) without any computer.
  - **Reusable proofs**: In EasyCrypt it is hard to reuse a proof in a different context, since if a single line in a function changes we need to rewrite the whole proof. Diagrammatic proofs allow a much higher reusability since every diagram (i.e. "blocks of codes") equality can be reused.
On the longer term, we also aim to translate proofs written in this tool into proof in other frameworks (Rocq, EasyCrypt…).

## Why this name "VeryyDiag" and how do you pronounce it?

Pronounce `VeryyDiag` like `Verydiag` (but you may spend more time on the `y` if you enjoy it!). `Diag` stands for `diagrams` (surprising no?) and `Veryy` for `verification` as we aim to provide formal verification tool based on diagram rewriting rules. Why `Veryy` and not `Veri`? For a bunch of reasons:
- `VeriDiag`/`VeryDiag` already existed in a completely different context (seems like good names are rare… at least I keep the same pronunciation), and maybe not veryy funnyy.
- A `y` looks close to a flipped `λ` that is common in verification/functional programming languages… and having a flipped `λ` next to a `y` allows us to have a fancy logo close to the fractal recursive Sierpiński triangle! (and recursion will plays a great role in our tool!)

## Contribute

If you want to contribute to this project, see [the file `README_DEV.md`](./README_DEV.md).

## To know

- Gwenview [does not support nested SVG](https://bugs.kde.org/show_bug.cgi?id=518490), so don't be surprised if you open the diagram there and all nodes are gone. Open them with a browser, inkscape, another image viewer, emacs…
