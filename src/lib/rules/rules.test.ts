import { describe, expect, test } from 'vitest'
import { checkDiagram } from './rules.svelte'

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
            from: "mySingleNode.missingAnchor",
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
            to: "mySingleNode.missingAnchor",
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
  })
})
