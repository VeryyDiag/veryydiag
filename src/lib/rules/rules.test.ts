import { describe, expect, test } from 'vitest'
import { checkDiagram, checkRule } from './rules.svelte'

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
            nodeKind: "basicKind"
          },
        },
        linksWithID: {
          foo: {
            from: "mySingleNode.out0",
            to: "mySingleNode.in0",
          }
        },
      }, {
        availableNodes: {
          basicKind: {
            anchors: {
              out0: {},
              in0: {},
            }
          },
        },
      })).toBe(true)
    })

    test('Test broken link input/output', () => {
      // Missing from from
      expect(() =>checkDiagram({
        nodes: {
          mySingleNode: {
            nodeKind: "basicKind"
          },
        },
        linksWithID: {
          foo: {
            from: "whoAmI.in0",
            to: "mySingleNode.out0",
          }
        },
      }, {
        availableNodes: {
          basicKind: {
            anchors: {
              out0: {},
              in0: {},
            }
          },
        },
      })).toThrow()
      
      // Missing to
      expect(() =>checkDiagram({
        nodes: {
          mySingleNode: {
            nodeKind: "basicKind"
          },
        },
        linksWithID: {
          foo: {
            from: "mySingleNode.out0",
            to: "whoAmI.in0",
          }
        },
      }, {
        availableNodes: {
          basicKind: {
            anchors: {
              out0: {},
              in0: {},
            }
          },
        },
      })).toThrow()
    })
    
    test('Test broken anchors', () => {
      // Missing anchor from
      expect(() =>checkDiagram({
        nodes: {
          mySingleNode: {
            nodeKind: "basicKind"
          },
        },
        linksWithID: {
          foo: {
            from: "mySingleNode.missingAnchor", // <-- that's wrong
            to: "mySingleNode.out0",
          }
        },
      }, {
        availableNodes: {
          basicKind: {
            anchors: {
              out0: {},
              in0: {},
            }
          },
        },
      })).toThrow()
      
      // Missing anchor to
      expect(() =>checkDiagram({
        nodes: {
          mySingleNode: {
            nodeKind: "basicKind"
          },
        },
        linksWithID: {
          foo: {
            from: "mySingleNode.out0",
            to: "mySingleNode.missingAnchor", // <-- that's wrong
          }
        },
      }, {
        availableNodes: {
          basicKind: {
            anchors: {
              out0: {},
              in0: {},
            }
          },
        },
      })).toThrow()
    })

    test('Trivial diagram with a parameter (default value)', () => {
      expect(checkDiagram({
        nodes: {
          myGateA: {
            nodeKind: "gate"
          },
        },
      }, {
        availableNodes: {
          gate: {
            anchors: {
              in: {},
              out: {}
            },
            paramSpecs: {
              gateName: {
                type: "string",
                default: "My Gate",
              },
            },
          },
        },
      })).toBe(true)
    })

    test('Trivial diagram with a parameter (non default value)', () => {
      expect(checkDiagram({
        nodes: {
          myGateA: {
            nodeKind: "gate",
            params: {
              gateName: {
                value: "XOR",
              },
            }
          },
        },
      }, {
        availableNodes: {
          gate: {
            anchors: {
              in: {},
              out: {}
            },
            paramSpecs: {
              gateName: {
                type: "string",
                default: "My Gate",
              },
            },
          },
        },
      })).toBe(true)
    })

    test('Trivial broken diagram with a badly typed default parameter', () => {
      expect(() => checkDiagram({
        nodes: {
          myGateA: {
            nodeKind: "gate",
          },
        },
      }, {
        availableNodes: {
          gate: {
            anchors: {
              in: {},
              out: {}
            },
            paramSpecs: {
              gateName: {
                type: "string",
                default: false, // <-- that's wrong
              },
            },
          },
        },
      }
      )).toThrow()
    })

    test('Trivial broken diagram with a badly typed parameter', () => {
      expect(() => checkDiagram({
        nodes: {
          myGateA: {
            nodeKind: "gate",
            params: {
              gateName: {
                value: false, // <-- that's wrong
              },
            }
          },
        },
      }, {
        availableNodes: {
          gate: {
            anchors: {
              in: {},
              out: {}
            },
            paramSpecs: {
              gateName: {
                type: "string",
                default: "My Gate",
              },
            },
          },
        },
      })).toThrow()
    })

    test('Trivial broken diagram with a non-existing parameter', () => {
      expect(() => checkDiagram({
        nodes: {
          myGateA: {
            nodeKind: "gate",
            params: {
              gateNameee: {
                value: false,
              },
            }
          },
        },
      }, {
        availableNodes: {
          gate: {
            anchors: {
              in: {},
              out: {}
            },
            paramSpecs: {
              gateName: {
                type: "string",
                default: "My Gate",
              },
            },
          },
        },
      })).toThrow()
    })

    
    test('Trivial diagram with a boundary node', () => {
      expect(checkDiagram({
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
      }, {
        availableNodes: {
          basicKind: {
            anchors: {
              in: {}
            }
          },
          boundary: {
            anchors: {
              boundary: {}
            },
            paramSpecs: {
              boundaryName: {
                type: "string",
                default: "1",
              },
            }
          },
        },
      })).toBe(true)
    })
    
    test('Boundary nodes should have a single anchor called boundary', () => {
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
      }, {
        availableNodes: {
          basicKind: {
            anchors: {
              in: {}
            }
          },
          boundary: {
            anchors: {
              boundary: {},
              shouldNotBeHere: {},
            },
          },
        },
      })).toThrow()
    })
    
    test('Boundary nodes must have a boundary name', () => {
      expect(() => checkDiagram({
        nodes: {
          nodeA: {
            nodeKind: "basicKind"
          },
          boundaryA: {
            nodeKind: "boundary",
          },
        },
        linksWithID: {
          l: {from: "nodeA.in", to: "boundaryA.boundary"}
        },
      }, {
        availableNodes: {
          basicKind: {
            anchors: {
              in: {}
            }
          },
          boundary: {
            anchors: {
              boundary: {}
            }
          },
        },
      })).toThrow()
    })
  })

  describe('Well formed rules', () => {
    test('Trivial rule one node', () => {
      expect(checkRule({
        // Rule
        lhs: {
          nodes: {
            myA: {
              nodeKind: "A"
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
      }, {
        // Theory
        availableNodes: {
          A: {
            anchors: {
              in: {}
            }
          },          
          B: {
            anchors: {
              in: {}
            }
          },          
        },
      })).toBe(true)
    })

    test('Trivial broken rule (broken diagram)', () => {
      expect(() => checkRule({
        // Rule
        lhs: {
          nodes: {
            myA: {
              nodeKind: "A"
            },
          },
        },
        rhs: {
          nodes: {
            myB: {
              nodeKind: "BB" // <-- That's wrong
            },
          },
        },
      }, {
        // Theory
        availableNodes: {
          A: {
            anchors: {
              in: {}
            }
          },          
          B: {
            anchors: {
              in: {}
            }
          },          
        },
      })).toThrow()
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
      }, {
        // Theory
        availableNodes: {
          A: {
            anchors: {
              in: {}
            }
          },          
          B: {
            anchors: {
              in: {}
            }
          },
          boundary: boundaryAvailableNode
        },
      })).toBe(true)
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
      }, {
        // Theory
        availableNodes: {
          A: {
            anchors: {
              in: {}
            }
          },          
          B: {
            anchors: {
              in: {}
            }
          },
          boundary: boundaryAvailableNode
        },
      })).toBe(true)
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
      }, {
        // Theory
        availableNodes: {
          A: {
            anchors: {
              in: {}
            }
          },          
          B: {
            anchors: {
              in: {}
            }
          },
          boundary: boundaryAvailableNode
        },
      })).toThrow()
    })

    test('Wrong rule with non unique boundaries', () => {
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
      }, {
        // Theory
        availableNodes: {
          A: {
            anchors: {
              in: {}
            }
          },          
          B: {
            anchors: {
              in: {}
            }
          },
          boundary: boundaryAvailableNode
        },
      })).toThrow()
    })

  })
})
