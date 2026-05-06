import { describe, expect, test } from 'vitest'
import { checkDiagram, checkRule } from './rules.svelte'
import { ProofDiagError, type AvailableNode, type Diagram, type Theory } from '$lib/types/types'
// Nice syntax to update nested objects in an immutable way via
// const myobj2 = produce(myobj, draft => {draft.foo.bar.baz = 5})
import { produce, castDraft, type Draft } from "immer"
import { editCopy } from '$lib/utils.svelte' 

// TODO: check if exactly one link to boundary (not more, not less)

// Here are some practical constants that we use regularly in our tests

const boundaryAvailableNode = {
  anchors: {
    boundary: {}
  },
  paramSpecs: {
    boundaryName: {
      type: "string",
      default: "1",
    },
  }
} satisfies AvailableNode // Satisfies = specify a type (so I get errors if I mistype a property)
// but it also remembers more refined properties so that I can type later
// boundaryAvailableNode.anchors.boundary
// without getting warning about this being possibly undefinied.

const theoryA = {
  // Theory
  availableNodes: {
    A: {}
  },
} satisfies Theory;


const theoryABC = {
  // Theory
  availableNodes: {
    A: {
      anchors: {
        out: {}
      }
    },          
    A2: {
      anchors: {
        out: {}
      }
    },
    B: {
      anchors: {
        in: {},
        out: {}
      }
    },
    B2: {
      anchors: {
        in: {},
        out: {}
      }
    },
    C: {
      anchors: {
        in: {}
      }
    },
    boundary: boundaryAvailableNode
  },
} satisfies Theory;

const theoryABCparam = {
  // Theory
  availableNodes: {
    A: {
      anchors: {
        out: {}
      }
    },          
    A2: {
      anchors: {
        out: {}
      }
    },          
    B: {
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
    },
    B2: {
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
    },
    C: {
      anchors: {
        in: {}
      }
    },
    boundary: boundaryAvailableNode
  },
} satisfies Theory;

const diagramA = {
  nodes: {
    myA: {
      nodeKind: "A"
    },
  },
} satisfies Diagram

const diagramA2 = {
  nodes: {
    myA2: {
      nodeKind: "A2"
    },
  },
} satisfies Diagram

const diagramB = {
  nodes: {
    myB: {
      nodeKind: "B"
    },
  },
} satisfies Diagram

const diagramB2 = {
  nodes: {
    myB2: {
      nodeKind: "B2"
    },
  },
} satisfies Diagram

const diagramBparam = {
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

const diagramC = {
  nodes: {
    myC: {
      nodeKind: "C"
    },
  },
} satisfies Diagram

const diagramAtoC = {
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

const diagramAtoAlice = {
  nodes: {
    myA: diagramA.nodes.myA,
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
    foo: {
      from: "myA.out",
      to: "aliceBoundary.boundary"
    },
  },
} satisfies Diagram

const diagramA2toAlice = {
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

const diagramBtoAliceAndBob = {
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

const diagramB2toAliceAndBob = {
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

    
    test('Trivial diagram with a boundary node', () => {
      expect(checkDiagram(diagramAtoAlice, theoryABC)).toBe(true)
    })
    
    test('Boundary nodes should have a single anchor called boundary', () => {
      expect(() => checkDiagram(diagramAtoAlice, editCopy(theoryABC, (draft: any) => {
        draft.availableNodes.boundary.anchors.shouldNotBeHere = {}
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
})
