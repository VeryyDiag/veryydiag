# ProofDiag & CryptoDiag

This repository hosts two related projects:
- **ProofDiag**: A generic web-based program called allowing you to write diagrammatic proofs by applying some graph rewriting rules. You have lot's of freedom here: just define your basic nodes (SVG images with some special attributes to define connections) and rewriting rules (from the software), and you can prove that two graphs are equivalent based on these rewriting rules.
- **CryptoDiag**: We also instantiate these rules to obtain a framework to write formal security proofs. These proofs aim to be:
  - **Intuitive**: once you know the framework, it should be as simple as possible (at least compared to Rocq…) to transfer an intuition of security like "this part is secret" into a formal security proof.
  - **Easy to read**: proofs written into existing frameworks (EasyCrypt…) are just impossible to read and check without the help of a computer. Reading the proof gives little intuition while we aim to
  - **Short**
  - **Quick to write**
  - **Expressive**
  - **Quantum compatible**: existing frameworks can't really deal with the specificities of quantum cryptography where it is, for instance, impossible to copy a quantum state.

On the longer term, we also aim to translate proofs written in this tool into proof in other frameworks (Rocq, Easycrypt…).

## Contribute

If you want to contribute to this project, see [the file `README_DEV.md`](./README_DEV.md).

## To know

- Gwenview [does not support nested SVG](https://bugs.kde.org/show_bug.cgi?id=518490), so don't be surprised if you open the diagram there and all nodes are gone. Open them with a browser, inkscape, another image viewer, emacs…
