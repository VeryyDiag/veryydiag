import { describe, expect, test } from 'vitest'
import { checkDiagram, checkRule, proofApplyRule } from './rules.svelte'
import { ProofDiagError, type AvailableNode, type Diagram, type Theory, type ProofStepApplyRule } from '$lib/types/types'
// Nice syntax to update nested objects in an immutable way via
// const myobj2 = editCopy(myobj, draft => {draft.foo.bar.baz = 5})
import { editCopy } from '$lib/utils'

// TODO: check if exactly one link to boundary (not more, not less)

// Here are some practical constants that we use regularly in our tests

export const boundaryAvailableNode = {
  parsedSVG: {
    anchors: {
      boundary: {}
    },
    paramSpecs: {
      boundaryName: {
        type: "string",
        default: "1",
      },
      multipleWiresAllowed: {
        type: "boolean",
        default: false,
      },
    }
  }
} satisfies AvailableNode // Satisfies = specify a type (so I get errors if I mistype a property)
// but it also remembers more refined properties so that I can type later
// boundaryAvailableNode.anchors.boundary
// without getting warning about this being possibly undefinied.

export const theoryA = {
  // Theory
  availableNodes: {
    A: {}
  },
} satisfies Theory;


export const theoryABC = {
  // Theory
  availableNodes: {
    A: {
      parsedSVG: {
        anchors: {
          out: {}
        }
      }
    },
    A2: {
      parsedSVG: {
        anchors: {
          out: {}
        }
      }
    },
    B: {
      parsedSVG: {
        anchors: {
          in: {},
          out: {}
        }
      }
    },
    B2: {
      parsedSVG: {
        anchors: {
          in: {},
          out: {}
        }
      }
    },
    C: {
      parsedSVG: {
        anchors: {
          in: {}
        }
      }
    },
    boundary: boundaryAvailableNode
  },
} satisfies Theory;

export const theoryABCparam = {
  // Theory
  availableNodes: {
    A: {
      parsedSVG: {
        anchors: {
          out: {}
        }
      }
    },
    A2: {
      parsedSVG: {
        anchors: {
          out: {}
        }
      }
    },
    B: {
      parsedSVG: {
        anchors: {
          in: {},
          out: {}
        },
        paramSpecs: {
          gateName: {
            type: "string",
            default: "XOR"
          }
        },
      }
    },
    B2: {
      parsedSVG: {
        anchors: {
          in: {},
          out: {}
        },
        paramSpecs: {
          gateName: {
            type: "string",
            default: "XOR"
          }
        }
      },
    },
    C: {
      parsedSVG: {
        anchors: {
          in: {}
        }
      }
    },
    boundary: boundaryAvailableNode
  },
} satisfies Theory;

export const diagramA = {
  nodes: {
    myA: {
      nodeKind: "A"
    },
  },
} satisfies Diagram

export const diagramAprime = {
  nodes: {
    myAprime: {
      nodeKind: "A"
    },
  },
} satisfies Diagram

export const diagramA2 = {
  nodes: {
    myA2: {
      nodeKind: "A2"
    },
  },
} satisfies Diagram

export const diagramA2prime = {
  nodes: {
    myA2prime: {
      nodeKind: "A2"
    },
  },
} satisfies Diagram

export const diagramB = {
  nodes: {
    myB: {
      nodeKind: "B"
    },
  },
} satisfies Diagram

export const diagramB2 = {
  nodes: {
    myB2: {
      nodeKind: "B2"
    },
  },
} satisfies Diagram

export const diagramAB = {
  nodes: {
    myA: {
      nodeKind: "A"
    },
    myB: {
      nodeKind: "B"
    },
  },
} satisfies Diagram

export const diagramBparam = {
  nodes: {
    myB: {
      nodeKind: "B",
      params: {
        gateName: {
          value: "XOR"
        }
      }
    },
  },
} satisfies Diagram

export const diagramC = {
  nodes: {
    myC: {
      nodeKind: "C"
    },
  },
} satisfies Diagram

export const diagramAtoC = {
  nodes: {
    myA: diagramA.nodes.myA,
    myC: diagramC.nodes.myC,
  },
  linksWithID: {
    foo: {
      from: "myA.out",
      to: "myC.in"
    },
  },
} satisfies Diagram

export const diagramAprimetoCprime = {
  nodes: {
    myAprime: diagramA.nodes.myA,
    myCprime: diagramC.nodes.myC,
  },
  linksWithID: {
    fooPrime: {
      from: "myAprime.out",
      to: "myCprime.in"
    },
  },
} satisfies Diagram

export const diagramAtoCandA = {
  nodes: {
    myA: diagramA.nodes.myA,
    myC: diagramC.nodes.myC,
  },
  linksWithID: {
    foo: {
      from: "myA.out",
      to: "myC.in"
    },
    toAitself: {
      from: "myA.out",
      to: "myA.out"
    },
  },
} satisfies Diagram

export const diagramA2toC = {
  nodes: {
    myA2: diagramA2.nodes.myA2,
    myC: diagramC.nodes.myC,
  },
  linksWithID: {
    foo: {
      from: "myA2.out",
      to: "myC.in"
    },
  },
} satisfies Diagram

export const diagramAtoAlice = {
  nodes: {
    myA: diagramA.nodes.myA,
    aliceBoundary: {
      nodeKind: "boundary",
      params: {
        boundaryName: {
          value: "Alice",
        },
        multipleWiresAllowed: {
          value: false
        },
      },
    }
  },
  linksWithID: {
    foo: {
      from: "myA.out",
      to: "aliceBoundary.boundary"
    },
  },
} satisfies Diagram

export const diagramAprimetoAlice = {
  nodes: {
    myAprime: diagramAprime.nodes.myAprime,
    aliceBoundary: {
      nodeKind: "boundary",
      params: {
        boundaryName: {
          value: "Alice",
        },
      },
    }
  },
  linksWithID: {
    fooPrime: {
      from: "myAprime.out",
      to: "aliceBoundary.boundary"
    },
  },
} satisfies Diagram

export const diagramAprimetoAliceAndHerself = {
  nodes: {
    myAprime: diagramAprime.nodes.myAprime,
    aliceBoundary: {
      nodeKind: "boundary",
      params: {
        boundaryName: {
          value: "Alice",
        },
      },
    }
  },
  linksWithID: {
    fooPrime: {
      from: "myAprime.out",
      to: "aliceBoundary.boundary"
    },
    toAitselfPrime: {
      from: "myAprime.out",
      to: "myAprime.out"
    },
  },
} satisfies Diagram


export const diagramA2toAlice = {
  nodes: {
    myA2: diagramA2.nodes.myA2,
    myAliceBoundary: {
      nodeKind: "boundary",
      params: {
        boundaryName: {
          value: "Alice",
        },
      },
    }
  },
  linksWithID: {
    foo: {
      from: "myA2.out",
      to: "myAliceBoundary.boundary"
    },
  },
} satisfies Diagram

export const diagramA2primetoAlice = {
  nodes: {
    myA2prime: diagramA2prime.nodes.myA2prime,
    aliceBoundary: {
      nodeKind: "boundary",
      params: {
        boundaryName: {
          value: "Alice",
        },
      },
    }
  },
  linksWithID: {
    bar: {
      from: "myA2prime.out",
      to: "aliceBoundary.boundary"
    },
  },
} satisfies Diagram




export const diagramBtoAliceAndBob = {
  nodes: {
    myB: diagramB.nodes.myB,
    aliceBoundary: {
      nodeKind: "boundary",
      params: {
        boundaryName: {
          value: "Alice",
        },
      },
    },
    bobBoundary: {
      nodeKind: "boundary",
      params: {
        boundaryName: {
          value: "Bob",
        },
      },
    }
  },
  linksWithID: {
    fromAlice: {
      from: "aliceBoundary.boundary",
      to: "myB.in"
    },
    toBob: {
      from: "myB.out",
      to: "bobBoundary.boundary"
    },
  },
} satisfies Diagram

export const diagramB2toAliceAndBob = {
  nodes: {
    myB2: diagramB2.nodes.myB2,
    aliceBoundary: {
      nodeKind: "boundary",
      params: {
        boundaryName: {
          value: "Alice",
        },
      },
    },
    bob2Boundary: {
      nodeKind: "boundary",
      params: {
        boundaryName: {
          value: "Bob",
        },
      },
    }
  },
  linksWithID: {
    // TODO: test with commenting this field if random line (95) in utils.svelte.ts is again pointed
    // by vitest
    fromAlice: {
      from: "aliceBoundary.boundary",
      to: "myB2.in"
    },
    toBob: {
      from: "myB2.out",
      to: "bob2Boundary.boundary"
    },
  },
} satisfies Diagram

// Rules to apply
export const theoryABCrules = {
  // Theory
  availableNodes: theoryABC.availableNodes,
  rules: {
    AtoA2: {
      lhs: diagramA,
      rhs: diagramA2
    },
    AprimetoA2prime: {
      lhs: diagramAprime,
      rhs: diagramA2prime
    },
    AprimetoA2primeWithLinks: {
      lhs: diagramAprimetoAlice,
      rhs: diagramA2primetoAlice,
    },
    AitselfprimetoA2primeWithLinks: {
      lhs: diagramAprimetoAliceAndHerself,
      rhs: diagramA2primetoAlice,
    },
  }
} satisfies Theory;

export const proofStepAtoA2 = {
  kind: "applyRule",
  ruleName: "AtoA2",
  direction: "lr",
  nodeBijectionAB: {
    myA: "myA",
  },
  nodeBijectionCD: {
    myA2: "myA2"
  },
  linkBijectionCD: {},
} satisfies ProofStepApplyRule

export const proofStepAtoA2ViaPrime = {
  kind: "applyRule",
  ruleName: "AprimetoA2prime",
  direction: "lr",
  nodeBijectionAB: {
    myA: "myAprime",
  },
  linkBijectionAB: {},
  nodeBijectionCD: {
    myA2prime: "myA2"
  },
  linkBijectionCD: {},
} satisfies ProofStepApplyRule

export const proofStepAtoA2ViaPrimeInverse = {
  kind: "applyRule",
  ruleName: "AprimetoA2prime",
  direction: "rl",
  nodeBijectionAB: {
    myA2: "myA2prime"
  },
  linkBijectionAB: {},
  nodeBijectionCD: {
    myAprime: "myA",
  },
  linkBijectionCD: {},
} satisfies ProofStepApplyRule

export const proofStepAtoA2WithLinksViaPrime = {
  kind: "applyRule",
  ruleName: "AprimetoA2primeWithLinks",
  direction: "lr",
  nodeBijectionAB: {
    myA: "myAprime",
  },
  boundaryAnchorsBA: {
    "aliceBoundary.boundary": "myC.in",
  },
  linkBijectionAB: {
    foo: "fooPrime"
  },
  nodeBijectionCD: {
    myA2prime: "myA2"
  },
  linkBijectionCD: {
    bar: "foo"
  },
} satisfies ProofStepApplyRule

export const proofStepAitselftoA2WithLinksViaPrime = {
  kind: "applyRule",
  ruleName: "AitselfprimetoA2primeWithLinks",
  direction: "lr",
  nodeBijectionAB: {
    myA: "myAprime",
  },
  boundaryAnchorsBA: {
    "aliceBoundary.boundary": "myC.in",
  },
  linkBijectionAB: {
    foo: "fooPrime",
    toAitself: "toAitselfPrime",
  },
  nodeBijectionCD: {
    myA2prime: "myA2"
  },
  linkBijectionCD: {
    bar: "foo"
  },
} satisfies ProofStepApplyRule

// Describe = group tests by (sub)-category
describe('Test well formed diagrams/rules/…', () => {
  describe('Well formed diagrams', () => {
    test('Trivial diagram is well formed', () => {
      expect(checkDiagram(diagramA, theoryA)).toBe(true)
    })

    test('Trivial broken diagrams are not well formed', () => {
      expect(() => checkDiagram({
        nodes: {
          mySingleNode: {
            nodeKind: "missingKind"
          },
        },
      }, theoryA)).toThrow(ProofDiagError)

      expect(() => checkDiagram({
        nodes: {
          "name.with.a.dot": {
            nodeKind: "A"
          },
        },
      }, theoryA)).toThrow(ProofDiagError)

      expect(() => checkDiagram(<any>{
        nodes: {
          mySingleNode: {
          },
        },
        linksWithID: {},
      }, {
        availableNodes: {
          basicKind: {},
        },
      })).toThrow(ProofDiagError)
    })


    test('Test valid links', () => {
      expect(checkDiagram(diagramAtoC, theoryABC)).toBe(true)
    })

    test('Test broken link input/output', () => {
      // Missing from
      expect(() => checkDiagram(editCopy(diagramAtoC, (draft) => {
        draft.linksWithID.foo.from = "whoAmI.out"
      }), theoryABC)).toThrow(ProofDiagError)

      // Missing to
      expect(() => checkDiagram(editCopy(diagramAtoC, (draft) => {
        draft.linksWithID.foo.to = "whoAmI.in"
      }), theoryABC)).toThrow(ProofDiagError)
    })

    test('Test broken anchors', () => {
      // Missing/bad anchor from
      expect(() => checkDiagram(editCopy(diagramAtoC, (draft) => {
        draft.linksWithID.foo.from = "myA"
      }), theoryABC)).toThrow(ProofDiagError)
      expect(() => checkDiagram(editCopy(diagramAtoC, (draft) => {
        draft.linksWithID.foo.from = "myA.idontexist"
      }), theoryABC)).toThrow(ProofDiagError)

      // Missing anchor to
      expect(() => checkDiagram(editCopy(diagramAtoC, (draft) => {
        draft.linksWithID.foo.to = "myC"
      }), theoryABC)).toThrow(ProofDiagError)
      expect(() => checkDiagram(editCopy(diagramAtoC, (draft) => {
        draft.linksWithID.foo.to = "myC.idontexist"
      }), theoryABC)).toThrow(ProofDiagError)
    })

    test('Trivial diagram with a parameter (default value)', () => {
      expect(checkDiagram(diagramB, theoryABCparam)).toBe(true)
    })

    test('Trivial diagram with a parameter (non default value)', () => {
      expect(checkDiagram(diagramBparam, theoryABCparam)).toBe(true)
    })

    test('Trivial broken diagram with a badly typed default parameter', () => {
      expect(() => checkDiagram(diagramB, editCopy(theoryABCparam, (draft: any) => {
        draft.availableNodes.B.paramSpecs.gateName.default = false
      }))).toThrow(ProofDiagError)
    })

    test('Trivial broken diagram with a badly typed parameter', () => {
      expect(() => checkDiagram(editCopy<Diagram>(diagramBparam, (draft) => {
        draft!.nodes!.myB!.params!.gateName!.value = false
      }), theoryABCparam)).toThrow(ProofDiagError)
    })

    test('Trivial broken diagram with a non-existing parameter', () => {
      expect(() => checkDiagram(
        editCopy<Diagram>(diagramBparam, (draft) => {
          draft!.nodes!.myB!.params!.gateNamee = draft!.nodes!.myB!.params!.gateName
          delete draft!.nodes!.myB!.params!.gateName
        }),
        theoryABCparam)).toThrow(ProofDiagError)

      expect(checkDiagram(
        editCopy<Diagram>(diagramBparam, (draft) => {
          // We just change it twice so in fact this does nothing, just to check that it
          // works here, i.e. that this does what we expect it to do
          draft!.nodes!.myB!.params!.gateNamee = draft!.nodes!.myB!.params!.gateName
          delete draft!.nodes!.myB!.params!.gateName
          draft!.nodes!.myB!.params!.gateName = draft!.nodes!.myB!.params!.gateNamee
          delete draft!.nodes!.myB!.params!.gateNamee
        }),
        theoryABCparam)).toBe(true)

    })


    test('Trivial diagram with a mone-wire boundary node', () => {
      expect(checkDiagram(diagramAtoAlice, theoryABC)).toBe(true)
    })

    test('Trivial diagram with a multi-wire boundary node', () => {
      expect(checkDiagram(editCopy(diagramAtoAlice, (draft: any) => {
        draft.nodes.aliceBoundary.params.multipleWiresAllowed.value = true;
      }), theoryABC)).toBe(true)
    })

    test('Boundary nodes should have a single anchor called boundary', () => {
      expect(() => checkDiagram(diagramAtoAlice, editCopy(theoryABC, (draft: any) => {
        draft.availableNodes.boundary.parsedSVG.anchors.shouldNotBeHere = {}
      }))).toThrow(ProofDiagError)
    })

    test('Boundary nodes must have a boundary name', () => {
      expect(() => checkDiagram(diagramAtoAlice, editCopy(theoryABC, (draft : any) => {
        delete draft.availableNodes.boundary.paramSpecs.boundaryName
      }))).toThrow(ProofDiagError)

      expect(() => checkDiagram(editCopy(diagramAtoAlice, (draft: any) => {
        delete draft.nodes.aliceBoundary.params.boundaryName.value
      }), editCopy(theoryABC, (draft : any) => {
        delete draft.availableNodes.boundary.paramSpecs.boundaryName
      }))).toThrow(ProofDiagError)

      expect(() => checkDiagram(editCopy(diagramAtoAlice, (draft: any) => {
        delete draft.nodes.aliceBoundary.params.boundaryName.value
      }), theoryABC)).toThrow(ProofDiagError)

      expect(checkDiagram(editCopy(diagramAtoAlice, (draft: any) => {
        // It is removed, but then we use the default value, so it's OK
        delete draft.nodes.aliceBoundary.params
      }), theoryABC)).toBe(true)
    })

    test('Multi-wire boundary nodes should have exactly one connected link', () => {
      // Zero link
      expect(() => checkDiagram(editCopy(diagramAtoAlice, (draft: any) => {
        draft.nodes.aliceBoundary.params.multipleWiresAllowed = true;
        delete draft.linksWithID.foo
      }), theoryABC)).toThrow(ProofDiagError)
      // 2 links
      expect(() => checkDiagram(editCopy(diagramAtoAlice, (draft: any) => {
        draft.nodes.aliceBoundary.params.multipleWiresAllowed = true;
        draft.linksWithID.foo2 = {
          from: "myA.out",
          to: "aliceBoundary.boundary"
        }
      }), theoryABC)).toThrow(ProofDiagError)
    })

    test('Mono-wire boundary nodes may have an arbitrary number of connected link', () => {
      // Zero link
      expect(checkDiagram(editCopy(diagramAtoAlice, (draft: any) => {
        delete draft.linksWithID.foo
      }), theoryABC)).toBe(true)
      // 2 links
      expect(checkDiagram(editCopy(diagramAtoAlice, (draft: any) => {
        draft.linksWithID.foo2 = {
          from: "myA.out",
          to: "aliceBoundary.boundary"
        }
      }), theoryABC)).toBe(true)
    })


  })

  describe('Well formed rules', () => {
    test('Trivial rule one node', () => {
      expect(checkRule({
        // Rule
        lhs: diagramA,
        rhs: diagramB,
      }, theoryABC)).toBe(true)
    })

    test('Trivial broken rule (broken diagram)', () => {
      expect(() => checkRule({
        // Rule
        lhs: diagramA,
        rhs: editCopy(diagramB, (draft: any) => {draft.nodes.myB.nodeKind = "BB"})
      }, theoryABC)).toThrow(ProofDiagError)
    })

    test('Simple valid rule with one boundary', () => {
      expect(checkRule({
        // Rule
        lhs: diagramAtoAlice,
        rhs: diagramA2toAlice
      }, theoryABC)).toBe(true)
    })

    test('Simple valid rule with two boundaries', () => {
      expect(checkRule({
        // Rule
        lhs: diagramBtoAliceAndBob,
        rhs: diagramB2toAliceAndBob
      }, theoryABC)).toBe(true)
    })

    test('Wrong rule with different boundaries', () => {
      expect(() => checkRule({
        // Rule
        lhs: diagramAtoAlice,
        rhs: diagramA,
      }, theoryABC)).toThrow(ProofDiagError)
    })

    test('Wrong rule with non unique boundaries', () => {
      const rule : any = {
        // Rule
        lhs: editCopy(diagramBtoAliceAndBob, (draft) => {
          draft.nodes.bobBoundary.params.boundaryName.value = "Alice"
        }),
        rhs: editCopy(diagramBtoAliceAndBob, (draft) => {
          draft.nodes.bobBoundary.params.boundaryName.value = "Alice"
        })
      };
      expect(() => checkRule(rule, theoryABC)).toThrow(ProofDiagError)

      expect(() => checkRule(editCopy<any>(rule, (draft) => {
        delete draft.lhs.nodes.bobBoundary
        delete draft.lhs.linksWithID.toBob
      }), theoryABC)).toThrow(ProofDiagError)

      // If we delete both problematic elements we are good again
      expect(checkRule(editCopy<any>(rule, (draft) => {
        delete draft.lhs.nodes.bobBoundary
        delete draft.lhs.linksWithID.toBob
        delete draft.rhs.nodes.bobBoundary;
        delete draft.rhs.linksWithID.toBob
      }), theoryABC)).toBe(true)
    })

  })

  describe('Test application of proofApplyRule', () => {
    test('Trivial one node rule, no link', () => {
      expect(proofApplyRule(diagramA, proofStepAtoA2, theoryABCrules)).toEqual(diagramA2)
    })
    test('Trivial one node rule, no link, but different names', () => {
      expect(
        proofApplyRule(diagramA, proofStepAtoA2ViaPrime, theoryABCrules)
      ).toEqual(diagramA2)
    })
    test('Apply rule other direction', () => {
      expect(
        proofApplyRule(diagramA2, proofStepAtoA2ViaPrimeInverse, theoryABCrules)
      ).toEqual(diagramA)
    })
    test('Trivial broken rule with node name mismatch', () => {
      expect(
        () => proofApplyRule(diagramAprime, // <-- should be diagramA to work
                                proofStepAtoA2ViaPrime, theoryABCrules)
      ).toThrow(ProofDiagError)
    })
    test('Trivial broken rule with links', () => {
      expect(
        () => proofApplyRule(diagramAtoC, // <-- this contains an extra link that breaks the proof
                                proofStepAtoA2, theoryABCrules)
      ).toThrow(ProofDiagError)
    })

    test('Simple rule with one link', () => {
      expect(proofApplyRule(diagramAtoC,
                            proofStepAtoA2WithLinksViaPrime, theoryABCrules)
      ).toEqual(diagramA2toC)
    })

    test('Simple rule with one renamed link', () => {
      // Try to rename the output node
      expect(proofApplyRule(diagramAtoC,
                            editCopy(proofStepAtoA2WithLinksViaPrime, (draft) => {
                              draft.nodeBijectionCD.myA2prime = "nameIprefer"
                            }), theoryABCrules)
      ).toEqual(editCopy(diagramA2toC, (draft:any) => {
        draft.nodes.nameIprefer = draft.nodes.myA2
        delete draft.nodes.myA2
        draft.linksWithID.foo.from = "nameIprefer.out"
      }))
    })

    test('Simple rule with flipped link (links are undirected)', () => {
      expect(proofApplyRule(editCopy(diagramAtoC,
                                     (draft) => {
                                       const t = draft.linksWithID.foo.to
                                       const f = draft.linksWithID.foo.from
                                       draft.linksWithID.foo = {from: f, to: t}}),
                            proofStepAtoA2WithLinksViaPrime, theoryABCrules)
      ).toEqual(diagramA2toC)
    })

    test('Renaming works', () => {
      // Try to rename the output node
      expect(proofApplyRule(diagramAtoC,
                            editCopy(proofStepAtoA2WithLinksViaPrime, (draft) => {
                                 draft.nodeBijectionCD.myA2prime = "nameIprefer"
                               }), theoryABCrules)
      ).toEqual(editCopy(diagramA2toC, (draft:any) => {
        draft.nodes.nameIprefer = draft.nodes.myA2
        delete draft.nodes.myA2
        draft.linksWithID.foo.from = "nameIprefer.out"
      }))
    })

    test('Simple broken rules with one link', () => {
      expect(() => proofApplyRule(diagramAtoC,
                                  editCopy(proofStepAtoA2WithLinksViaPrime, (draft: any) => {
                                    draft.nodeBijectionAB.idontexist = "myAprime"
                                  }), theoryABCrules)
      ).toThrow(ProofDiagError)

      expect(() => proofApplyRule(
        diagramAtoC,
        editCopy(proofStepAtoA2WithLinksViaPrime, (draft: any) => {
          draft.nodeBijectionAB.dontexist = draft.nodeBijectionAB.myA2prime
          delete draft.nodeBijectionAB.myA2prime
        }), theoryABCrules)
      ).toThrow(ProofDiagError)

      // We just rename the links so that the matching does not work
      expect(() => proofApplyRule(editCopy(diagramAtoC,
                                           (draft) => {
                                             draft.linksWithID.foo.from = draft.linksWithID.foo.to}),
                                  proofStepAtoA2WithLinksViaPrime, theoryABCrules)
      ).toThrow(ProofDiagError)


      // Mapping of boundary is important
      expect(() => proofApplyRule(diagramAtoC,
                                  editCopy(proofStepAtoA2WithLinksViaPrime, (draft: any) => {
                                    draft.boundaryAnchorsBA = {}
                               }), theoryABCrules)
      ).toThrow(ProofDiagError)


      // Bad boundary name (to)
      expect(() => proofApplyRule(diagramAtoC,
                                  editCopy(proofStepAtoA2WithLinksViaPrime, (draft: any) => {
                                    draft.boundaryAnchorsBA = {
                                      "aliceBoundary.boundary": "idontexist.in",
                                    }
                                  }), theoryABCrules)
      ).toThrow(ProofDiagError)

      // Bad boundary name (from)
      expect(() => proofApplyRule(diagramAtoC,
                                  editCopy(proofStepAtoA2WithLinksViaPrime, (draft: any) => {
                                    draft.boundaryAnchorsBA = {
                                      "idontexist.boundary": "myC.in",
                                    }
                                  }), theoryABCrules)
      ).toThrow(ProofDiagError)

    })

    test('Simple rules with internal links', () => {

      // Diagram with internal wires not existing in the rule
      expect(() => proofApplyRule(diagramAtoCandA,
                                  proofStepAtoA2WithLinksViaPrime,
                                  theoryABCrules)
      ).toThrow(ProofDiagError)

      // We updated the rule to add this extra internal link, now it works:
      expect(proofApplyRule(diagramAtoCandA,
                            proofStepAitselftoA2WithLinksViaPrime,
                            theoryABCrules)
      ).toEqual(diagramA2toC)


    })

    // TODO: ID and copy rules in ZX are interesting to test
  })

})
