import { describe, expect, test } from 'vitest'
import { checkDiagram, checkRule } from './rules.svelte'

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
}

const theoryABC = {
  // Theory
  availableNodes: {
    A: {
      anchors: {
        in: {}
      }
    },          
    B: {
      anchors: {
        in: {},
        out: {}
      }
    },
    C: {
      anchors: {
        out: {}
      }
    },
    boundary: boundaryAvailableNode
  },
};

const theoryABCparam = {
  // Theory
  availableNodes: {
    A: {
      anchors: {
        in: {}
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
    C: {
      anchors: {
        in: {}
      }
    },
    boundary: boundaryAvailableNode
  },
};

const diagramA = {
  nodes: {
    myA: {
      nodeKind: "A"
    },
  },
}

const diagramB = {
  nodes: {
    myB: {
      nodeKind: "B"
    },
  },
}

// Describe = group tests by (sub)-category
describe('Test well formed diagrams/rules/…', () => {
  describe('Well formed diagrams', () => {
    test('Trivial diagram is well formed', () => {
      expect(checkDiagram({
        nodes: {
          mySingleNode: {
            nodeKind: "basicKind"
          },
        },
        linksWithID: {},
      }, {
        availableNodes: {
          basicKind: {},
        },
      })).toBe(true)
    })

    test('Trivial broken diagrams are not well formed', () => {
      expect(() => checkDiagram({
        nodes: {
          mySingleNode: {
            nodeKind: "missingKind"
          },
        },
        linksWithID: {},
      }, {
        availableNodes: {
          basicKind: {},
        },
      })).toThrow()
      // We force the type to any as this is not well typed (no nodeKind) but we also want to tests
      // non-well typed diagrams.
      const brokenDiag : any = {
        nodes: {
          mySingleNode: {
          },
        },
        linksWithID: {},
      }
      expect(() => checkDiagram(brokenDiag, {
        availableNodes: {
          basicKind: {},
        },
      })).toThrow()
    })


    test('Test valid links', () => {
      // Link exists
      expect(checkDiagram({
        nodes: {
          mySingleNode: {
            nodeKind: "B"
          },
        },
        linksWithID: {
          foo: {
            from: "mySingleNode.in", // <-- that's wrong
            to: "mySingleNode.out",
          }
        },
      }, theoryABC)).toBe(true)
    })

    test('Test broken link input/output', () => {
      // Missing from
      expect(() => checkDiagram({
        nodes: {
          mySingleNode: {
            nodeKind: "B"
          },
        },
        linksWithID: {
          foo: {
            from: "whoAmI.in", // <-- that's wrong
            to: "mySingleNode.out",
          }
        },
      }, theoryABC)).toThrow()
      
      // Missing to
      expect(() => checkDiagram({
        nodes: {
          mySingleNode: {
            nodeKind: "B"
          },
        },
        linksWithID: {
          foo: {
            from: "mySingleNode.in", 
            to: "whoAmI.out", // <-- that's wrong
          }
        },
      }, theoryABC)).toThrow()
    })
    
    test('Test broken anchors', () => {
      // Missing anchor from
      expect(() =>checkDiagram({
        nodes: {
          mySingleNode: {
            nodeKind: "B"
          },
        },
        linksWithID: {
          foo: {
            from: "mySingleNode.idontexist", // <-- that's wrong
            to: "mySingleNode.out",
          }
        },
      }, theoryABC)).toThrow()

      // Missing anchor from
      expect(() =>checkDiagram({
        nodes: {
          mySingleNode: {
            nodeKind: "B"
          },
        },
        linksWithID: {
          foo: {
            from: "mySingleNode.in",
            to: "mySingleNode.idontexist", // <-- that's wrong
          }
        },
      }, theoryABC)).toThrow()
    })

    test('Trivial diagram with a parameter (default value)', () => {
      expect(checkDiagram({
        nodes: {
          myGate: {
            nodeKind: "B"
          },
        },
      }, theoryABCparam)).toBe(true)
    })

    test('Trivial diagram with a parameter (non default value)', () => {
      expect(checkDiagram({
        nodes: {
          myGateA: {
            nodeKind: "B",
            params: {
              gateName: {
                value: "XOR",
              },
            }
          },
        },
      }, theoryABCparam)).toBe(true)
    })

    test('Trivial broken diagram with a badly typed default parameter', () => {
      let theory : any = structuredClone(theoryABCparam)
      theory.availableNodes.B.paramSpecs.gateName.default = false
      expect(() => checkDiagram({
        nodes: {
          myGateA: {
            nodeKind: "gate",
          },
        },
      }, theory)).toThrow()
    })

    test('Trivial broken diagram with a badly typed parameter', () => {
      expect(() => checkDiagram({
        nodes: {
          myGateA: {
            nodeKind: "B",
            params: {
              gateName: {
                value: false, // <-- that's wrong
              },
            }
          },
        },
      }, theoryABCparam)).toThrow()
    })

    test('Trivial broken diagram with a non-existing parameter', () => {
      expect(() => checkDiagram({
        nodes: {
          myGateA: {
            nodeKind: "B",
            params: {
              gateNamee: {
                value: "coucou",
              },
            }
          },
        },
      }, theoryABCparam)).toThrow()
    })

    
    test('Trivial diagram with a boundary node', () => {
      expect(checkDiagram({
        nodes: {
          nodeA: {
            nodeKind: "A"
          },
          boundaryAlice: {
            nodeKind: "boundary",
            params: {
              boundaryName: {
                value: "Alice",
              },
            },
          },
        },
        linksWithID: {
          l: {from: "nodeA.in", to: "boundaryAlice.boundary"}
        },
      }, theoryABC)).toBe(true)
    })
    
    test('Boundary nodes should have a single anchor called boundary', () => {
      let theory : any = structuredClone(theoryABC)
      theory.availableNodes.boundary.anchors.shouldNotBeHere = {}
      
      expect(() => checkDiagram({
        nodes: {
          nodeA: {
            nodeKind: "basicKind"
          },
          boundaryAlice: {
            nodeKind: "boundary",
            params: {
              boundaryName: {
                value: "Alice",
              },
            },
          },
        },
        linksWithID: {
          l: {from: "nodeA.in", to: "boundaryAlice.boundary"}
        },
      }, theory)).toThrow()
    })
    
    test('Boundary nodes must have a boundary name', () => {
      let theory : any = structuredClone(theoryABC)
      delete theory.availableNodes.boundary.paramSpecs.boundaryName
      expect(() => checkDiagram({
        nodes: {
          nodeA: {
            nodeKind: "A"
          },
          boundaryA: {
            nodeKind: "boundary",
          },
        },
        linksWithID: {
          l: {from: "nodeA.in", to: "boundaryA.boundary"}
        },
      }, theory)).toThrow()
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
      let diagramBad = structuredClone(diagramB)
      diagramBad.nodes.myB.nodeKind = "BB"
      expect(() => checkRule({
        // Rule
        lhs: diagramA,
        rhs: diagramBad
      }, theoryABC)).toThrow()
    })

    test('Simple valid rule with one boundary', () => {
      expect(checkRule({
        // Rule
        lhs: {
          nodes: {
            myA: {
              nodeKind: "A"
            },
            Alice: {
              nodeKind: "boundary",
              params: {
                boundaryName: {
                  value: "Alice"
                },
              },
            },
          },
        },
        rhs: {
          nodes: {
            myB: {
              nodeKind: "B"
            },
            bar: {
              nodeKind: "boundary",
              params: {
                boundaryName: {
                  value: "Alice"
                },
              },
            },
          },
        },
      }, theoryABC)).toBe(true)
    })

    test('Simple valid rule with two boundaries', () => {
      expect(checkRule({
        // Rule
        lhs: {
          nodes: {
            myA: {
              nodeKind: "A"
            },
            Alice: {
              nodeKind: "boundary",
              params: {
                boundaryName: {
                  value: "Alice"
                },
              },
            },
            Bob: {
              nodeKind: "boundary",
              params: {
                boundaryName: {
                  value: "Bob"
                },
              },
            },
          },
        },
        rhs: {
          nodes: {
            myB: {
              nodeKind: "B"
            },
            bar: {
              nodeKind: "boundary",
              params: {
                boundaryName: {
                  value: "Alice"
                },
              },
            },
            baz: {
              nodeKind: "boundary",
              params: {
                boundaryName: {
                  value: "Bob"
                },
              },
            },
          },
        },
      }, theoryABC)).toBe(true)
    })

    test('Wrong rule with different boundaries', () => {
      expect(() => checkRule({
        // Rule
        lhs: {
          nodes: {
            myA: {
              nodeKind: "A"
            },
            Alice: {
              nodeKind: "boundary",
              params: {
                boundaryName: {
                  value: "Alice"
                },
              },
            },
          },
        },
        rhs: {
          nodes: {
            myB: {
              nodeKind: "B"
            },
          },
        },
      }, theoryABC)).toThrow()
    })

    test('Wrong rule with non unique boundaries', () => {
      const rule : any = {
        // Rule
        lhs: {
          nodes: {
            myA: {
              nodeKind: "A"
            },
            Alice: {
              nodeKind: "boundary",
              params: {
                boundaryName: {
                  value: "Alice"
                },
              },
            },
            Bob: {
              nodeKind: "boundary",
              params: {
                boundaryName: {
                  value: "Alice"
                },
              },
            },
          },
        },
        rhs: {
          nodes: {
            myB: {
              nodeKind: "B"
            },
            bar: {
              nodeKind: "boundary",
              params: {
                boundaryName: {
                  value: "Alice"
                },
              },
            },
            baz: {
              nodeKind: "boundary",
              params: {
                boundaryName: {
                  value: "Alice"
                },
              },
            },
          },
        },
      };
      let ruleA = structuredClone(rule)
      expect(() => checkRule(ruleA, theoryABC)).toThrow()
      delete ruleA.lhs.nodes.Bob;
      expect(() => checkRule(ruleA, theoryABC)).toThrow()
      delete ruleA.rhs.nodes.baz;
      // If we delete both problematic elements we are good again
      expect(checkRule(ruleA, theoryABC)).toBe(true)
      let ruleB = structuredClone(rule)
      delete ruleB.rhs.nodes.baz;
      expect(() => checkRule(ruleB, theoryABC)).toThrow()
    })

  })
})
